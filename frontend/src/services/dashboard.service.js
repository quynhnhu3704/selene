import http from "./http";

export const getDashboardStatistics = async (params, signal) => {
  const res = await http.get("/orders/manage/dashboard", {
    params,
    signal,
    timeout: 60000,
  });
  return res.data;
};
