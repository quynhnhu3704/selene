// frontend\src\pages\Account\Profile\pages\ChangePassword.jsx
import { Helmet } from "react-helmet-async";
import PasswordPanel from "../components/PasswordPanel";

export default function ChangePassword() {
  return (
    <>
      <Helmet>
        <title>Đổi mật khẩu | Selene</title>
      </Helmet>

      <PasswordPanel />
    </>
  );
}