import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/axios';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await api.get('/api/orders');
        setOrders(response.data);
      } catch (err) {
        setError('Failed to fetch orders. Please login again.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  if (loading) return <div className="loading">Loading orders...</div>;

  return (
    <div className="orders-container">
      <div className="header">
        <h2>Your Orders</h2>
        <button onClick={handleLogout} className="logout-btn">Logout</button>
      </div>
      {error && <div className="error-message">{error}</div>}
      
      {!error && (
        <table className="orders-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Product</th>
              <th>Price</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>{order.id}</td>
                <td>{order.product}</td>
                <td>${order.price}</td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan="3" className="no-data">No orders found.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Orders;
