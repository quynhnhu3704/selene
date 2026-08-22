// frontend\src\pages\Account\Profile\pages\Orders.jsx
import { Helmet } from "react-helmet-async";
import OrdersPanel from "../components/OrdersPanel";

export default function Orders() {
  return (
    <>
      <Helmet>
        <title>Đơn hàng của bạn | Selene</title>
      </Helmet>

      <OrdersPanel />
    </>
  );
}
