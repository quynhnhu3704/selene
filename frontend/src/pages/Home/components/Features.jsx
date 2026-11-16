import { useId } from "react";

const features = [
  { icon: "truck", title: "Miễn phí vận chuyển", description: "Trong khu vực TP.HCM" },
  { icon: "member", title: "Đặc quyền thành viên", description: "Tích điểm & nâng hạng" },
  { icon: "wallet", title: "Thanh toán linh hoạt", description: "Đa dạng phương thức" },
  { icon: "shield", title: "An tâm mua sắm", description: "Hoàn 100% khi hàng lỗi" },
];

function FeatureIcon({ type }) {
  return (
    <svg viewBox="0 0 88 80" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {type === "truck" && <>
        <path d="M24 58h-5V16h45v42H38m26 0h8m13 0h2V40l-8-15H64M8 23h6M2 34h12M6 45h8M10 56h4" />
        <path d="M41 34c-7-10-15 1 0 9 15-8 7-19 0-9Z" />
        <ellipse cx="31" cy="60" rx="7" ry="8" /><ellipse cx="78" cy="60" rx="7" ry="8" />
      </>}
      {type === "member" && <>
        <rect x="13" y="17" width="61" height="47" rx="6" />
        <path d="M19 56h49M32 45l-4-14 10 5 6-11 6 11 10-5-4 14Z" />
      </>}
      {type === "wallet" && <>
        <path d="M18 23 58 12q7-2 7 6v5M19 23h51q5 0 5 5v34q0 5-5 5H24q-6 0-6-6V28q0-5 6-5Z" />
        <path d="M67 37h2m-2 11h2" />
      </>}
      {type === "shield" && <>
        <path d="M44 10 66 17q5 2 3 12c-2 21-12 34-25 42C30 63 20 50 19 29q-2-10 3-12Z" />
        <path d="m35 37 8 9 14-16" />
      </>}
    </svg>
  );
}

function Ribbon({ variant }) {
  const id = useId();
  return <svg className={`rb-feat-ribbon rb-feat-ribbon--${variant}`} viewBox="0 0 500 168" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop stopColor="#d7a096" stopOpacity=".85" />
        <stop offset=".28" stopColor="#e9bfb6" stopOpacity=".75" />
        <stop offset=".65" stopColor="#f4ded8" stopOpacity=".65" />
        <stop offset="1" stopColor="#fffaf7" stopOpacity=".9" />
      </linearGradient>
      <linearGradient id={`${id}-light`} x1="0" y1="0" x2="0" y2="1">
        <stop stopColor="#fffdfb" stopOpacity=".95" />
        <stop offset="1" stopColor="#edcdc5" stopOpacity=".5" />
      </linearGradient>
    </defs>
    {variant === 0 && <>
      <path fill={`url(#${id})`} d="M12 139C65 166 91 137 137 146C179 151 188 165 235 169C174 176 146 160 111 159C69 160 40 173 12 139Z" />
      <path fill={`url(#${id}-light)`} d="M253 168C345 164 427 121 499 87C494 111 487 128 474 140C399 164 332 178 253 168Z" />
    </>}
    {variant === 1 && <>
      <path fill={`url(#${id})`} d="M196 0C268 29 308 5 365-8C425-25 474-3 494 55L500 80C474 45 460 12 425 12C381 10 355 36 310 27C271 20 241 7 196 0Z" />
      <path fill={`url(#${id}-light)`} d="M212 2C276 24 310 12 367-2C415-15 459-3 479 31C455 3 421 0 390 10C347 25 319 34 284 21Z" />
      <path fill={`url(#${id})`} d="M4 132C51 162 102 158 178 168C99 175 30 164 4 132Z" />
    </>}
    {variant === 2 && <>
      <path fill={`url(#${id})`} d="M257 168C302 155 320 128 365 132C412 135 445 160 472 121C486 101 494 86 500 76C495 120 486 147 463 158C433 174 403 144 367 145C331 145 304 177 257 168Z" />
      <path fill={`url(#${id}-light)`} d="M293 169C333 153 350 141 373 145C414 153 438 170 468 157C435 183 402 163 379 157C347 149 327 173 293 169Z" />
    </>}
    {variant === 3 && <>
      <path fill={`url(#${id})`} d="M300 0C384-5 455-1 487 35C437 15 410 9 362 5Z" />
      <path fill={`url(#${id}-light)`} d="M346 0C409 0 452 8 480 27C430 10 396 6 346 0Z" />
      <path fill={`url(#${id})`} d="M46 166C104 164 134 139 182 143C232 145 261 170 323 168C251 178 211 155 175 155C128 154 94 175 46 166Z" />
    </>}
  </svg>;
}

function Flowers({ position }) {
  const id = useId();
  return <svg className={`rb-feat-flowers rb-feat-flowers--${position}`} viewBox="0 0 160 115" fill="none" aria-hidden="true">
    <defs>
      <radialGradient id={id}><stop stopColor="#e7b5a0" stopOpacity=".8" /><stop offset=".5" stopColor="#f8e3d5" stopOpacity=".85" /><stop offset="1" stopColor="#fff6ed" stopOpacity=".65" /></radialGradient>
    </defs>
    {[[32, 79, .75, -12], [62, 39, 1, 8], [111, 24, .78, 24]].map(([x, y, scale, rotation], index) => <g key={index} transform={`translate(${x} ${y}) rotate(${rotation}) scale(${scale})`}>
      {[0, 72, 144, 216, 288].map(angle => <g key={angle} transform={`rotate(${angle})`}>
        <path d="M0 0C-10-5-25-17-19-29C-16-36-9-34-6-33C0-39 9-32 10-26C12-15 4-6 0 0Z" fill={`url(#${id})`} stroke="#e4b6a2" strokeOpacity=".6" />
        <path d="M0-2-7-26M-1-5-15-23M0-5 4-25" stroke="#ddb39d" strokeWidth=".65" opacity=".45" />
      </g>)}
      <circle r="4" fill="#a77b55" /><circle cx="-1" cy="-1" r="1.8" fill="#e5ce9c" />
      {[0, 60, 120, 180, 240, 300].map(angle => <path key={angle} transform={`rotate(${angle})`} d="M2 0 8 3" stroke="#b18a62" strokeWidth="1" />)}
    </g>)}
  </svg>;
}

export default function Features() {
  return (
    <section className="rb-features" aria-label="Quyền lợi mua sắm tại Selene">
      <ul className="rb-features-list">
        {features.map(({ icon, title, description }, index) => (
          <li className={`rb-feat-item rb-feat-item--${icon}`} key={title}>
            <div className="rb-feat-surface" aria-hidden="true" />
            <Ribbon variant={index} />
            {index === 0 && <Flowers position="start" />}
            {index === 3 && <Flowers position="end" />}
            {index === 2 && <span className="rb-feat-sparkle" aria-hidden="true">✦</span>}
            <span className="rb-feat-icon"><FeatureIcon type={icon} /></span>
            <div className="rb-feat-copy">
              <div className="rb-feat-t1">{title}</div>
              <div className="rb-feat-t2">{description}</div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
