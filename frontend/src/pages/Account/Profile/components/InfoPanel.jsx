// // frontend\src\pages\Account\Profile\components\InfoPanel.jsx
// import { useEffect, useState } from "react";
// import { toast } from "react-toastify";
// import { saveUser } from "../../../../utils/auth";
// import { updateProfile } from "../../../../services/user.service";
// import defaultAvatar from "../../../../assets/images/default-avatar.png";

// export default function InfoPanel({
//   profile,
//   setProfile,
// }) {
//   const [editing, setEditing] = useState(false);
//   const [form, setForm] = useState({
//     full_name: "",
//     email: "",
//     phone_number: "",
//     gender: "",
//     dob: ""
//   });
//   const [avatarFile, setAvatarFile] = useState(null);
//   const [avatarPreview, setAvatarPreview] = useState(defaultAvatar);

//   const handleChange = (e) =>
//     setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

//   const handleAvatarChange = (e) => {
//     const file = e.target.files[0];
//     if (!file) return;
//     setAvatarFile(file);
//     setAvatarPreview(URL.createObjectURL(file));
//   };

//   const resetForm = () => {
//     if (!profile) return;

//     setForm({
//       full_name: profile.full_name || "",
//       email: profile.email || "",
//       phone_number: profile.phone_number || "",
//       gender: profile.gender || "",
//       dob: profile.dob || ""
//     });
//     setAvatarPreview(profile?.avatar_url || defaultAvatar);
//     setAvatarFile(null);
//   };

//   const handleSave = async (e) => {
//     e.preventDefault();
//     try {
//       const data = new FormData();
//       data.append("full_name", form.full_name);
//       data.append("phone_number", form.phone_number);
//       data.append("gender", form.gender);
//       data.append("dob", form.dob);
//       if (avatarFile) {
//         data.append("avatar_url", avatarFile);
//       }
//       const res = await updateProfile(data);
//       setProfile({
//         ...profile,
//         ...res.data.profile,
//         email: profile.email
//       });
//       saveUser({
//         ...profile,
//         ...res.data.profile,
//         email: profile.email
//       });
//       toast.success(res.data.message);
//       setEditing(false);
//       setAvatarFile(null);
//     }
//     catch (err) {
//       toast.error(err.response?.data?.message || "Cập nhật thất bại");
//     }
//   };

//   useEffect(() => {
//     resetForm();
//   }, [profile]);

//   const genderIcon = form.gender === "Nam" ? "bi-gender-male"
//     : form.gender === "Nữ" ? "bi-gender-female" : "bi-gender-ambiguous";

//   const Empty = () => <span style={{ color: "#ced4da", fontStyle: "italic", fontSize: 14 }}>Chưa cập nhật</span>;

//   return (
//     <>
//       <h5 className="acc-panel-title">THÔNG TIN TÀI KHOẢN</h5>

//       {/* ── HERO ── */}
//       <div className="info-hero">
//         <div className="info-avatar-wrap">
//           <img src={avatarPreview} alt="Avatar" className="info-avatar" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = defaultAvatar; }}/>
//           {editing && (
//             <>
//               <input id="avatar-upload" hidden type="file" accept="image/*" onChange={handleAvatarChange} />
//               <label htmlFor="avatar-upload" className="info-avatar-edit" title="Đổi ảnh">
//                 <i className="bi bi-camera-fill" />
//               </label>
//             </>
//           )}
//         </div>
//         <div>
//           <p className="info-hero-name">{form.full_name || "—"}</p>
//           <p className="info-hero-email">{form.email}</p>
//           <span className="info-hero-role"><i className="bi bi-person-check" />Khách hàng</span>
//         </div>
//       </div>

//       <form onSubmit={handleSave} noValidate>
//         <div className="info-grid">

//           {/* Họ tên */}
//           <div className="info-field">
//             <span className="info-field-label"><i className="bi bi-person" />Họ tên</span>
//             <div className="info-field-val">
//               {editing
//                 ? <input name="full_name" className="form-control" value={form.full_name} onChange={handleChange} maxLength={80} />
//                 : <span>{form.full_name || <Empty />}</span>}
//             </div>
//           </div>

//           {/* Email */}
//           <div className="info-field">
//             <span className="info-field-label"><i className="bi bi-envelope" />Email</span>
//             <div className="info-field-val">
//               {editing
//                 ? <input className="form-control" value={form.email} disabled />
//                 : <span>{form.email || <Empty />}</span>}
//             </div>
//           </div>

//           {/* Số điện thoại */}
//           <div className="info-field">
//             <span className="info-field-label"><i className="bi bi-telephone" />Số điện thoại</span>
//             <div className="info-field-val">
//               {editing
//                 ? <input name="phone_number" className="form-control" value={form.phone_number} onChange={handleChange} maxLength={15} />
//                 : <span>{form.phone_number || <Empty />}</span>}
//             </div>
//           </div>

//           {/* Giới tính */}
//           <div className="info-field">
//             <span className="info-field-label"><i className={`bi ${genderIcon}`} />Giới tính</span>
//             <div className="info-field-val">
//               {editing
//                 ? (
//                   <select name="gender" className="form-select" value={form.gender} onChange={handleChange}>
//                     <option value="">-- Chọn --</option>
//                     <option>Nam</option>
//                     <option>Nữ</option>
//                     <option>Khác</option>
//                   </select>
//                 )
//                 : <span>{form.gender || <Empty />}</span>}
//             </div>
//           </div>

//           {/* Ngày sinh */}
//           <div className="info-field">
//             <span className="info-field-label"><i className="bi bi-cake2" />Ngày sinh</span>
//             <div className="info-field-val">
//               {editing
//                 ? <input name="dob" type="date" className="form-control" value={form.dob} onChange={handleChange} />
//                 : <span>{form.dob || <Empty />}</span>}
//             </div>
//           </div>
          
//         </div>

//         {/* ── ACTIONS ── */}
//         <div className="info-actions">
//           {editing ? (
//             <>
//               <button type="submit" className="form-btn btn btn-dark fw-semibold px-4">
//                 <i className="bi bi-check2 me-1" /> Lưu thay đổi
//               </button>
//               <button type="button" className="form-btn btn btn-outline-dark fw-semibold px-4" onClick={() => { resetForm(); setEditing(false); }}>Huỷ</button>
//             </>
//           ) : (
//             <button type="button" className="form-btn btn btn-dark fw-semibold px-4" 
//               onClick={(e) => {
//                 e.preventDefault(); // Chặn hành vi submit mặc định nếu có
//                 e.stopPropagation(); // Chặn sự kiện nổi bọt lên thẻ div cha
//                 setEditing(true);
//               }}>
//               <i className="bi bi-pencil me-1" /> Chỉnh sửa thông tin
//             </button>
//           )}
//         </div>

//       </form>
//     </>
//   );
// }

// frontend\src\pages\Account\Profile\components\InfoPanel.jsx
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { saveUser } from "../../../../utils/auth";
import { updateProfile } from "../../../../services/user.service";
import defaultAvatar from "../../../../assets/images/default-avatar.png";

export default function InfoPanel({
  profile,
  setProfile,
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone_number: "",
    gender: "",
    dob: ""
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(defaultAvatar);

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const resetForm = () => {
    if (!profile) return;
    setForm({
      full_name: profile.full_name || "",
      email: profile.email || "",
      phone_number: profile.phone_number || "",
      gender: profile.gender || "",
      dob: profile.dob || ""
    });
    setAvatarPreview(profile?.avatar_url || defaultAvatar);
    setAvatarFile(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const data = new FormData();
      data.append("full_name", form.full_name);
      data.append("phone_number", form.phone_number);
      data.append("gender", form.gender);
      data.append("dob", form.dob);
      if (avatarFile) {
        data.append("avatar_url", avatarFile);
      }
      const res = await updateProfile(data);
      setProfile({
        ...profile,
        ...res.data.profile,
        email: profile.email
      });
      saveUser({
        ...profile,
        ...res.data.profile,
        email: profile.email
      });
      toast.success(res.data.message);
      setEditing(false);
      setAvatarFile(null);
    }
    catch (err) {
      toast.error(err.response?.data?.message || "Cập nhật thất bại");
    }
  };

  useEffect(() => {
    resetForm();
  }, [profile]);

  const genderIcon = form.gender === "Nam" ? "bi-gender-male"
    : form.gender === "Nữ" ? "bi-gender-female" : "bi-gender-ambiguous";

  const Empty = () => <span style={{ color: "#ced4da", fontStyle: "italic", fontSize: 14 }}>Chưa cập nhật</span>;

  return (
    <>
      <h5 className="panel-title">THÔNG TIN TÀI KHOẢN</h5>

      {/* ── HERO (đã bỏ nền) ── */}
      <div className="info-hero" style={{ background: "white", padding: "20px 0" }}>
        <div className="info-avatar-wrap">
          <img 
            src={avatarPreview} 
            alt="Avatar" 
            className="info-avatar" 
            onError={(e) => { 
              e.currentTarget.onerror = null; 
              e.currentTarget.src = defaultAvatar; 
            }}
          />
          {editing && (
            <>
              <input id="avatar-upload" hidden type="file" accept="image/*" onChange={handleAvatarChange} />
              <label htmlFor="avatar-upload" className="info-avatar-edit" title="Đổi ảnh">
                <i className="bi bi-camera-fill" />
              </label>
            </>
          )}
        </div>
        <div>
          <p className="info-hero-name">{form.full_name || "—"}</p>
          <p className="info-hero-email">{form.email}</p>
          <span className="info-hero-role"><i className="bi bi-person-check" />Khách hàng</span>
        </div>
      </div>

      <form onSubmit={handleSave} noValidate>
        <div className="info-grid">

          {/* Họ tên */}
          <div className="info-field">
            <div className="form-label-row">
              <span className="form-label"><i className="bi bi-person me-1" />Họ tên</span>
            </div>
            <div className="info-field-val">
              {editing ? (
                <input 
                  name="full_name" 
                  className="form-control" 
                  value={form.full_name} 
                  onChange={handleChange} 
                  maxLength={80} 
                />
              ) : (
                <span>{form.full_name || <Empty />}</span>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="info-field">
            <div className="form-label-row">
              <span className="form-label"><i className="bi bi-envelope me-1" />Email</span>
            </div>
            <div className="info-field-val">
              {editing ? (
                <input className="form-control" value={form.email} disabled />
              ) : (
                <span>{form.email || <Empty />}</span>
              )}
            </div>
          </div>

          {/* Số điện thoại */}
          <div className="info-field">
            <div className="form-label-row">
              <span className="form-label"><i className="bi bi-telephone me-1" />Số điện thoại</span>
            </div>
            <div className="info-field-val">
              {editing ? (
                <input 
                  name="phone_number" 
                  className="form-control" 
                  value={form.phone_number} 
                  onChange={handleChange} 
                  maxLength={15} 
                />
              ) : (
                <span>{form.phone_number || <Empty />}</span>
              )}
            </div>
          </div>

          {/* Giới tính */}
          <div className="info-field">
            <div className="form-label-row">
              <span className="form-label"><i className={`bi ${genderIcon} me-1`} />Giới tính</span>
            </div>
            <div className="info-field-val">
              {editing ? (
                <select 
                  name="gender" 
                  className="form-select" 
                  value={form.gender} 
                  onChange={handleChange}
                >
                  <option value="">-- Chọn --</option>
                  <option>Nam</option>
                  <option>Nữ</option>
                  <option>Khác</option>
                </select>
              ) : (
                <span>{form.gender || <Empty />}</span>
              )}
            </div>
          </div>

          {/* Ngày sinh */}
          <div className="info-field">
            <div className="form-label-row">
              <span className="form-label"><i className="bi bi-cake2 me-1" />Ngày sinh</span>
            </div>
            <div className="info-field-val">
              {editing ? (
                <input 
                  name="dob" 
                  type="date" 
                  className="form-control" 
                  value={form.dob} 
                  onChange={handleChange} 
                />
              ) : (
                <span>{form.dob || <Empty />}</span>
              )}
            </div>
          </div>
        </div>

        {/* ── ACTIONS ── */}
        <div className="info-actions">
          {editing ? (
            <>
              <button type="submit" className="form-btn btn btn-dark fw-semibold px-4">
                <i className="bi bi-check2 me-1" /> Lưu thay đổi
              </button>
              <button 
                type="button" 
                className="form-btn btn btn-outline-dark fw-semibold px-4" 
                onClick={() => { resetForm(); setEditing(false); }}
              >
                Huỷ
              </button>
            </>
          ) : (
            <button 
              type="button" 
              className="form-btn btn btn-dark fw-semibold px-4"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setEditing(true);
              }}
            >
              <i className="bi bi-pencil me-1" /> Chỉnh sửa thông tin
            </button>
          )}
        </div>
      </form>
    </>
  );
}