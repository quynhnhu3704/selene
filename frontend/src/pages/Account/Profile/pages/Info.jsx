// frontend\src\pages\Account\Profile\pages\Info.jsx
import { Helmet } from "react-helmet-async";
import { useOutletContext } from "react-router-dom";
import InfoPanel from "../components/InfoPanel";

export default function Info() {
  const { profile, setProfile } = useOutletContext();

  return (
    <>
      <Helmet>
        <title>Thông tin tài khoản | Selene</title>
      </Helmet>

      <InfoPanel profile={profile} setProfile={setProfile} />
    </>
  );
}
