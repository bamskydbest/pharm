import { useEffect, useState } from "react";
import api from "../components/services/api";
import SalesChart from "../components/charts/SalesChart";

type SalesReport = {
  date: string;
  total: number;
};

export default function Reports() {
  const [data, setData] = useState<SalesReport[]>([]);
  const [ledger, setLedger] = useState([]);
  
  
  useEffect(() => {
      api.get<SalesReport[]>("/reports/sales").then((res: { data: SalesReport[] }) => {
          setData(res.data);
        });
    }, []);
    
    useEffect(() => {
      api.get("/accounting/ledger").then((res) => setLedger(res.data));
    }, []);
    
  return (
    <div className="p-6">
      <h1 className="font-bold text-xl mb-4">Reports</h1>
      <SalesChart data={data} />
      <table className="w-full border mt-6">
  <thead>
    <tr>
      <th>Date</th>
      <th>Type</th>
      <th>Amount</th>
      <th>Ref</th>
    </tr>
  </thead>
  <tbody>
    {ledger.map((l: any) => (
      <tr key={l._id}>
        <td>{new Date(l.createdAt).toLocaleDateString()}</td>
        <td>{l.type}</td>
        <td>₵{l.amount}</td>
        <td>{l.reference}</td>
      </tr>
    ))}
  </tbody>
</table>

    </div>
  );
}
