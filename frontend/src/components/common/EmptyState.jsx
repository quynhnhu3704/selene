import emptyImage from "../../assets/images/empty.png";

export default function EmptyState({ text, className }) {
  const content = (
    <>
      <img src={emptyImage} className="empty-state-image" alt="" />
      {text && <p className="empty-state-text">{text}</p>}
    </>
  );

  return className ? <div className={className}>{content}</div> : content;
}
