import { test, mock, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import { createServer } from 'node:http';
import { io as clientSocket } from '../../../frontend/node_modules/socket.io-client/build/esm/index.js';

// Real router, controllers, services, JWT and multipart parsing; isolated persistence.
mock.module('../src/configs/index.js', { namedExports: { config: { jwtAccessSecret: 'chat-test-only', frontendUrl: 'http://localhost' } } });
mock.module('../src/configs/supabase.js', { namedExports: { supabase: { storage: {
  listBuckets: async () => ({data:[{name:'chat'}]}),
  from: () => ({upload:async()=>({error:null}),getPublicUrl:path=>({data:{publicUrl:`https://storage.test/${path}`}})})
} } } });
mock.module('../../shared/access.mjs', { namedExports: { resolveRemoteAccess: async token => jwt.verify(token, 'chat-test-only') } });
mock.module('../src/services/order.service.js', { namedExports: { getCustomerOrders: async () => [] } });
const { ConversationModel: C } = await import('../src/models/conversation.model.js');
const { MessageModel: M } = await import('../src/models/message.model.js');
const { CustomerModel: U } = await import('../src/models/customer.model.js');
const { ReactionModel: R } = await import('../src/models/reaction.model.js');
const { default: routes } = await import('../src/routes/chat.routes.js');
const { createChatSocket } = await import('../src/socket.js');
const conversations = new Map();
const messages = new Map();
const reactions = new Map();
let sequence = 0;
C.findById = async id => conversations.get(String(id)) || null;
C.findByCustomerId = async id => [...conversations.values()].find(c => String(c.customer_id) === String(id));
C.findOpenByCustomerId = C.findByCustomerId;
C.findAllIdsByCustomerId = async id => [...conversations.values()].filter(c => c.customer_id === id).map(c => c.conversation_id);
C.findAll = async ({status,search}) => [...conversations.values()].filter(c => (!status || c.status === status || status === 'waiting' && c.status === 'pending') && (!search || c.customer_name.includes(search)));
C.countByStatus = async statuses => [...conversations.values()].filter(c => statuses.includes(c.status)).length;
C.create = async c => { conversations.set(c.conversation_id, c); return c; };
C.update = async (id, patch) => { const c = {...conversations.get(id), ...patch}; conversations.set(id,c); return c; };
C.addParticipant = C.upsertParticipant = async () => {};
U.findByAccountId = async id => ({account_id:id,full_name:'Khách thử nghiệm'});
M.create = async p => {
  const m = {message_id:p.messageId || `m${++sequence}`,conversation_id:p.conversationId,sender_id:p.senderId,sender_type:p.senderType,message_type:p.messageType,content:p.content,reply_to_message_id:p.replyToMessageId,attachments:p.attachments || [],created_at:new Date(Date.now()+sequence++).toISOString()};
  messages.set(m.message_id,m); return m;
};
M.findById = async id => messages.get(id);
M.findLatestByConversation = async id => [...messages.values()].filter(m=>m.conversation_id===id).at(-1);
M.findByConversation = async (id,before,limit) => { const all=[...messages.values()].filter(m=>m.conversation_id===id && (!before || m.created_at<before)); return {messages:all.slice(-limit),has_more:all.length>limit,next_cursor:all.slice(-limit)[0]?.created_at}; };
M.findByCustomer = async (id,ids,before,limit) => M.findByConversation(ids[0],before,limit);
R.findByMessageAndAccount = async (id,account) => [...reactions.values()].find(r=>r.message_id===id && r.account_id===account);
R.findByMessageId = async id => [...reactions.values()].filter(r=>r.message_id===id);
R.create = async p => { const r={reaction_id:`r${++sequence}`,message_id:p.messageId,account_id:p.accountId,reaction:p.reaction};reactions.set(r.reaction_id,r);return r; };
R.update = async (id,p) => { const r={...reactions.get(id),...p};reactions.set(id,r);return r; };
R.delete = async id => reactions.delete(id);
R.deleteByMessageAndAccount = async (id,account) => { const r=await R.findByMessageAndAccount(id,account);if(r) reactions.delete(r.reaction_id); };
const app=express();app.use(express.json());app.use(routes);
app.use((e,req,res,next)=>res.status(e.status || 500).json({message:e.message}));
const server=createServer(app);const io=createChatSocket(server);app.set('io',io);
server.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
after(()=>{io.close();server.close();});
const base=`http://127.0.0.1:${server.address().port}`;
const customer={accountId:'42',role:'customer',role_id:3,permissions:[]};
const staff={accountId:'staff',role:'staff',role_id:2,permissions:['chat:view','chat:reply','chat:assign','chat:close']};
async function request(path,{user=staff,method='GET',body}={}) {
  const headers={};if(user) headers.authorization=`Bearer ${jwt.sign(user,'chat-test-only')}`;
  if(body && !(body instanceof FormData)) {headers['content-type']='application/json';body=JSON.stringify(body);}
  const response=await fetch(base+path,{method,headers,body});return {status:response.status,...await response.json()};
}

test('all support routes: authentication, ownership, text, assignment, attachments, reply, reactions, close/reopen',async t=>{
  await t.test('authentication and admin permissions',async()=>{
    assert.equal((await request('/manage/conversations',{user:null})).status,401);
    assert.equal((await request('/manage/conversations',{user:customer})).status,403);
    assert.equal((await request('/manage/conversations',{user:{...staff,permissions:[]}})).status,403);
  });
  let id, messageId;
  await t.test('customer creates conversation and text; validation rejects empty/oversized input',async()=>{
    for(const content of ['', 'x'.repeat(2001)]) assert.equal((await request('/messages/text',{user:customer,method:'POST',body:{content}})).status,400);
    const result=await request('/messages/text',{user:customer,method:'POST',body:{content:'Xin chào'}});
    assert.equal(result.status,201);id=result.data.conversation.conversation_id;messageId=result.data.message.message_id;
    assert.equal(result.data.is_new_conversation,true);
    assert.equal(result.data.message.is_read,false);
    assert.equal((await request('/messages/text',{user:{...customer,accountId:'other'},method:'POST',body:{conversation_id:id,content:'test'}})).status,403);
  });
  await t.test('list, filter, summary, detail, customer history, pagination limits and sender ID normalization',async()=>{
    const list=await request('/manage/conversations?status=waiting');assert.equal(list.data.length,1);assert.equal(list.summary.waitingCount,1);
    messages.get(messageId).sender_id=42;
    const detail=await request(`/manage/conversations/${id}/messages`);assert.equal(detail.data.messages[0].sender_role,'customer');
    assert.equal((await request('/my-conversation/messages',{user:customer})).data.messages.length,1);
    for(const limit of ['-1','101','1.5','abc']) assert.equal((await request(`/manage/conversations/${id}/messages?limit=${limit}`)).status,400);
  });
  await t.test('assign adds greeting and preserves response contract',async()=>{
    const result=await request(`/manage/conversations/${id}/assign`,{method:'PUT',body:{staff_name:'Nhân viên'}});
    assert.equal(result.status,200);assert.equal(result.data.conversation.status,'processing');assert.ok(result.data.message.content.includes('Nhân viên'));
  });
  await t.test('multipart attachment metadata and reply retain files and parent message',async()=>{
    const body=new FormData();body.set('conversation_id',id);body.set('attachments',JSON.stringify([{file_url:'https://storage.test/photo.png',file_name:'photo.png',file_type:'image/png',file_size:128}]));
    const result=await request('/messages/attachments',{method:'POST',body});assert.equal(result.status,201);assert.equal(result.data.message.message_type,'image');
    const reply=await request(`/messages/${messageId}/reply`,{method:'POST',body:{conversation_id:id,content:'Dạ shop chào bạn'}});
    assert.equal(reply.status,201);assert.equal(reply.data.message.reply_to.message_id,messageId);
  });
  await t.test('reaction add/change/list/delete',async()=>{
    const path=`/messages/${messageId}/reaction`;
    assert.equal((await request(path,{method:'POST',body:{reaction:'👍'}})).data.action,'added');
    assert.equal((await request(path,{method:'POST',body:{reaction:'❤️'}})).data.action,'updated');
    assert.equal((await request(path)).data.length,1);
    assert.equal((await request(path,{method:'DELETE'})).data.reactions.length,0);
  });
  await t.test('multipart binary upload, multiple attachments, and uploaded reply',async()=>{
    for (const path of ['/messages/attachments', `/messages/${messageId}/reply`]) {
      const form=new FormData();form.set('conversation_id',id);form.set('content','Ảnh thử nghiệm');
      form.append('files',new Blob(['test-image'],{type:'image/png'}),'photo.png');
      form.append('files',new Blob(['test-file'],{type:'text/plain'}),'notes.txt');
      const result=await request(path,{method:'POST',body:form});
      assert.equal(result.status,201);assert.equal(result.data.message.attachments.length,2);
      assert.match(result.data.message.attachments[0].file_url,/^https:\/\/storage.test\//);
    }
  });
  await t.test('close preserves history and next customer message reopens',async()=>{
    assert.equal((await request(`/manage/conversations/${id}/close`,{method:'PUT'})).data.status,'closed');
    assert.ok((await request(`/manage/conversations/${id}/messages`)).data.messages.length>=3);
    const result=await request('/messages/text',{user:customer,method:'POST',body:{conversation_id:id,content:'Mình cần hỗ trợ thêm'}});
    assert.equal(result.status,201);assert.equal(result.data.conversation.status,'pending');
  });
  await t.test('real Socket.IO joins authorized room and delivers new message; other customer is denied',async()=>{
    const connect=async user=>{const socket=clientSocket(base,{path:'/api/chat/socket.io',transports:['websocket'],auth:{token:jwt.sign(user,'chat-test-only',{expiresIn:'5m'})}});await new Promise((resolve,reject)=>{socket.once('connect',resolve);socket.once('connect_error',reject);});return socket;};
    const socket=await connect(staff);const stranger=await connect({...customer,accountId:'other'});
    try {
      const joined=await socket.timeout(3000).emitWithAck('conversation:join',id);assert.equal(joined.success,true);
      assert.equal((await stranger.timeout(3000).emitWithAck('conversation:join',id)).success,false);
      const received=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Missing realtime message')),3000);socket.once('message:new',m=>{clearTimeout(timer);resolve(m);});});
      const sent=await request('/messages/text',{user:customer,method:'POST',body:{conversation_id:id,content:'Realtime'}});
      assert.equal((await received).message_id,sent.data.message.message_id);
    } finally {socket.disconnect();stranger.disconnect();}
  });
});
