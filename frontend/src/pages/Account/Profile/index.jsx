// frontend\src\pages\Account\Profile\index.jsx
// frontend/src/pages/Account/Profile/index.jsx

import { Helmet } from "react-helmet-async";
import Breadcrumb from "../../../components/layout/Breadcrumb";

export default function Profile() {
  return (
    <>
      <Helmet>
        <title>Tài Khoản Của Tôi | Selene</title>
      </Helmet>

      <Breadcrumb
        items={[
          { label: "Trang chủ", path: "/" },
          { label: "Tài khoản của tôi" },
        ]}
      />

      <div className="container py-5">
        <div className="card shadow-sm border-0">
          <div className="card-body p-4">

            <h2 className="mb-4">Thông tin cá nhân</h2>

            <div className="row">

              {/* Avatar */}
              <div className="col-md-3 text-center">
                <img
                  src="https://placehold.co/180x180"
                  alt="Avatar"
                  className="rounded-circle border"
                  width={180}
                  height={180}
                />

                <button className="btn btn-outline-dark mt-3 w-100">
                  Đổi ảnh
                </button>
              </div>

              {/* Thông tin */}
              <div className="col-md-9">

                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Họ và tên
                  </label>
                  <input
                    className="form-control"
                    value="Nguyễn Quỳnh Như"
                    readOnly
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Email
                  </label>
                  <input
                    className="form-control"
                    value="nhu@gmail.com"
                    readOnly
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Số điện thoại
                  </label>
                  <input
                    className="form-control"
                    value="0987654321"
                    readOnly
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Giới tính
                  </label>
                  <input
                    className="form-control"
                    value="Nữ"
                    readOnly
                  />
                </div>

                <div className="mb-4">
                  <label className="form-label fw-semibold">
                    Ngày sinh
                  </label>
                  <input
                    className="form-control"
                    value="20/05/2004"
                    readOnly
                  />
                </div>

                <button className="btn btn-dark">
                  Chỉnh sửa thông tin
                </button>

              </div>

            </div>

          </div>
        </div>
      </div>
    </>
  );
}