// frontend\src\pages\Register\index.jsx
import Breadcrumb from "../../components/layout/Breadcrumb";
import { Helmet } from "react-helmet-async";

export default function Register() {
  return (
    <>
        <Helmet>
            <title>Đăng Ký | Selene</title>
        </Helmet>

        <Breadcrumb
            items={[
                { label: "Trang chủ", path: "/" },
                { label: "Đăng ký" }
            ]}
        />

        <div className="container py-5">
            <div className="row justify-content-center">
            <div className="col-lg-5">

                <h2 className="text-center mb-4">
                Đăng ký tài khoản
                </h2>

                <form>

                <div className="mb-3">
                    <label className="form-label">
                    Họ tên
                    </label>

                    <input
                    className="form-control"
                    />
                </div>

                <div className="mb-3">
                    <label className="form-label">
                    Email
                    </label>

                    <input
                    type="email"
                    className="form-control"
                    />
                </div>

                <div className="mb-3">
                    <label className="form-label">
                    Mật khẩu
                    </label>

                    <input
                    type="password"
                    className="form-control"
                    />
                </div>

                <button
                    type="submit"
                    className="btn btn-dark w-100"
                >
                    Đăng ký
                </button>

                </form>

            </div>
            </div>
        </div>
    </>
  );
}