import Breadcrumb from "../../components/layout/Breadcrumb";
import { Helmet } from "react-helmet-async";

export default function Login() {
  return (
    <>
        <Helmet>
            <title>Đăng Nhập | Selene</title>
        </Helmet>

      <Breadcrumb
        items={[
          { label: "Trang chủ", path: "/" },
          { label: "Đăng nhập" }
        ]}
      />

      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-md-5">

            <h2 className="mb-4 text-center">
              Đăng nhập
            </h2>

            <form>
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
                Đăng nhập
              </button>

            </form>

          </div>
        </div>
      </div>
    </>
  );
}