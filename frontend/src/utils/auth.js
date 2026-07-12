// frontend\src\utils\auth.js
export const saveLogin = ({ accessToken, user, profile }) => {
    localStorage.setItem("accessToken", accessToken);

    localStorage.setItem(
        "user",
        JSON.stringify(user || profile)
    );
};

export const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
};

// THÊM
export const getAccessToken = () => {
    return localStorage.getItem("accessToken");
};

// THÊM
export const saveAccessToken = (accessToken) => {
    localStorage.setItem("accessToken", accessToken);
};

export const isLoggedIn = () => {
    return !!localStorage.getItem("accessToken");
};

export const getUser = () => {
    const data = localStorage.getItem("user");
    return data ? JSON.parse(data) : null;
};

export const saveUser = (user) => {
    localStorage.setItem(
        "user",
        JSON.stringify(user)
    );
};