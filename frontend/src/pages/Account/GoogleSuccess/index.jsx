// frontend\src\pages\Account\GoogleSuccess\index.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { saveLogin } from "../../../utils/auth";

export default function GoogleSuccess() {
    const navigate = useNavigate();

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);

        const accessToken = params.get("accessToken");
        const userString = params.get("user");

        if (!accessToken || !userString) {
            toast.error("Không thể xác thực bằng Google. Vui lòng thử lại.");
            navigate("/tai-khoan/dang-nhap");
            return;
        }

        const user = JSON.parse(decodeURIComponent(userString));

        saveLogin({
            accessToken,
            profile: user
        });

        window.dispatchEvent(
            new Event("login-success")
        );

        toast.success("Chào mừng bạn đến với Selene!");

        setTimeout(() => {
            if (user.role === "admin") {
                navigate("/admin");
            } else {
                navigate("/");
            }
        }, 1200);

    }, []);

    return (
        <div className="spinner-loading">
            <div className="spinner-border" role="status">
                <span className="visually-hidden">Loading...</span>
            </div>
        </div>
    );
}