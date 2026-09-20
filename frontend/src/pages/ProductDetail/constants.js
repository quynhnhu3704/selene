import blackColor from "../../assets/colors/black.jpg";
import whiteColor from "../../assets/colors/white.jpg";
import redColor from "../../assets/colors/red.jpg";
import orangeColor from "../../assets/colors/orange.jpg";
import pinkColor from "../../assets/colors/pink.jpg";
import brownColor from "../../assets/colors/brown.jpg";
import purpleColor from "../../assets/colors/purple.jpg";
import yellowColor from "../../assets/colors/yellow.jpg";
import grayColor from "../../assets/colors/gray.jpg";
import blueColor from "../../assets/colors/blue.jpg";
import greenColor from "../../assets/colors/green.jpg";
import mixedColor from "../../assets/colors/mixed.jpg";
import stripeColor from "../../assets/colors/stripe.jpg";

export const FAQS = [
  {
    q: "Đặt hàng Online thành công trong bao lâu tôi sẽ nhận được hàng?",
    a: "Khách hàng khi đã được xác nhận đơn hàng sẽ nhận được sản phẩm trong vòng từ 3-5 ngày làm việc (tuỳ thuộc khu vực nhận hàng).",
    bold: "trong vòng từ 3-5 ngày làm việc",
  },
  {
    q: "Đặt hàng Online tôi có được miễn phí vận chuyển không?",
    a: "Đơn hàng từ 498.000đ được miễn phí vận chuyển. Phí vận chuyển của đơn hàng được hiển thị tại bước thanh toán.",
  },
  {
    q: "Sản phẩm không vừa có thể đổi trả không?",
    a: "Bạn có thể liên hệ bộ phận hỗ trợ để được hướng dẫn đổi, trả miễn phí tại nhà nếu không hài lòng. Vui lòng giữ sản phẩm và tem mác đầy đủ để được hỗ trợ.",
  },
];

export const COMMITS = [
  { icon: "bi-arrow-repeat", text1: "Đổi, trả miễn phí", text2: "tại nhà nếu không hài lòng", link: "Xem chính sách ↗", path: "/ve-chung-toi" },
  { icon: "bi-truck", text1: "Giao trong 3-5 ngày", text2: "và freeship đơn từ 498k" },
  { icon: "bi-shield-check", text1: "Cam kết bảo mật", text2: "thông tin khách hàng" },
  { icon: "bi-chat-dots", text1: "Cần tư vấn thêm?", link: "Chat ngay!", path: "/ho-tro" },
];

export const SIZE_GUIDE_IMAGE = "https://deltasport.vn/wp-content/uploads/2025/07/San-pham-nu-moi.png";

const COLORS = {
  "đen": blackColor,
  "trắng": whiteColor,
  "đỏ": redColor,
  "cam": orangeColor,
  "hồng": pinkColor,
  "nâu": brownColor,
  "tím": purpleColor,
  "vàng": yellowColor,
  "xám": grayColor,
  "ghi": grayColor,
  "xanh": blueColor,
  "xanh dương": blueColor,
  "xanh lá": greenColor,
  "xanh lá cây": greenColor,
  "xanh than": blueColor,
  "xanh navy": blueColor,
  "be": brownColor,
  "kem": whiteColor,
  "hỗn hợp": mixedColor,
  "kẻ": stripeColor,
  "kẻ sọc": stripeColor,
};

export function getColorImage(color) {
  const name = (color || "").normalize("NFC").trim().toLocaleLowerCase("vi-VN");
  const match = Object.keys(COLORS).sort((a, b) => b.length - a.length)
    .find((key) => name.includes(key));
  return COLORS[name] || COLORS[match] || mixedColor;
}
