// frontend/src/pages/Admin/components/ProfilePage.jsx
import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { toast } from "react-toastify";
import ProfileForm from "./ProfileForm";
import Loading from "../../../components/common/Loading";
import {
  createAdminCustomer,
  createAdminStaff,
  getAdminUserDetail,
  updateAdminUser,
} from "../../../services/user.service";

export default function ProfilePage({
  role,
  create = false,
  readOnly = false,
}) {
  const { profileId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const base = role === "staff" ? "/admin/nhan-vien" : "/admin/khach-hang";
  const requestedReturn = params.get("returnUrl");
  const back =
    requestedReturn === base || requestedReturn?.startsWith(base + "?")
      ? requestedReturn
      : base;
  const title = `${create ? "Thêm" : readOnly ? "Chi tiết" : "Chỉnh sửa"} ${role === "staff" ? "nhân viên" : "khách hàng"}`;
  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
    phone: "",
    dob: "",
    gender: "",
    address: "",
    identity_card: "",
  });
  const [avatar, setAvatar] = useState(null);
  const [loading, setLoading] = useState(!create);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Tải hồ sơ cần xem hoặc chỉnh sửa
  useEffect(() => {
    if (create) return;
    let isCurrentRequest = true;
    getAdminUserDetail(profileId)
      .then(({ data }) => {
        if (!isCurrentRequest) return;
        if (
          role === "staff"
            ? ![1, 2].includes(Number(data.data.role_id))
            : Number(data.data.role_id) !== 3
        ) {
          setError("Người dùng không thuộc danh sách này.");
          return;
        }
        setProfile(data.data);
      })
      .catch((err) => {
        if (isCurrentRequest)
          setError(err.response?.data?.message || "Không thể tải hồ sơ!");
      })
      .finally(() => {
        if (isCurrentRequest) setLoading(false);
      });
    return () => {
      isCurrentRequest = false;
    };
  }, [create, profileId, role]);

  // Gửi thông tin hồ sơ
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const data = new FormData();
      [
        "full_name",
        "email",
        "phone",
        "dob",
        "gender",
        "address",
        "identity_card",
      ].forEach((key) => {
        data.append(key, String(profile[key] || "").trim());
      });
      if (avatar) data.append("avatar_url", avatar);
      const result = create
        ? await (role === "staff" ? createAdminStaff : createAdminCustomer)(
            data,
          )
        : await updateAdminUser(profile.account_id, data);
      toast.success(result.data.message || "Lưu thành công!");
      navigate(back);
    } catch (err) {
      toast.error(err.response?.data?.message || "Không thể lưu hồ sơ!");
    } finally {
      setSaving(false);
    }
  };
  if (loading) return <Loading text="Đang tải hồ sơ..." />;
  if (error)
    return (
      <>
        <div className="alert alert-danger">{error}</div>
        <Link to={back}>Quay lại danh sách</Link>
      </>
    );
  return (
    <>
      <Helmet>
        <title>{title} | Selene</title>
      </Helmet>
      <div className="adm-page-head">
        <div className="adm-page-title">{title}</div>
        <Link className="form-btn btn btn-outline-dark" to={back}>
          <i className="bi bi-arrow-left me-2" />
          Quay lại
        </Link>
      </div>
      <ProfileForm
        profile={profile}
        setProfile={setProfile}
        setAvatar={setAvatar}
        saving={saving}
        readOnly={readOnly}
        create={create}
        role={role}
        back={back}
        handleSubmit={handleSubmit}
      />
    </>
  );
}
