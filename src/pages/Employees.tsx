import { useEffect, useState } from "react";
import api from "../components/services/api";

type Employee = {
  _id: string;
  name: string;
  role: string;
};

export default function Employees() {
  const [staff, setStaff] = useState<Employee[]>([]);

  useEffect(() => {
    api.get<Employee[]>("/employees").then((res: { data: Employee[] }) => {
      setStaff(res.data);
    });
  }, []);

  return (
    <div className="p-6">
      <h1 className="font-bold text-xl">Employees</h1>
      {staff.map((s) => (
        <div key={s._id} className="border-b py-2">
          {s.name} — {s.role}
        </div>
      ))}
    </div>
  );
}

// import { useState } from "react";
// import api from "../services/api";

// export default function PermissionsEditor({ role }: any) {
//   const [perms, setPerms] = useState<string[]>(role.permissions);

//   const toggle = (p: string) =>
//     setPerms((prev) =>
//       prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
//     );

//   const save = async () => {
//     await api.put(`/roles/${role._id}`, { permissions: perms });
//     alert("Permissions updated");
//   };

//   return (
//     <div className="bg-white p-4 rounded shadow">
//       <h2 className="font-bold mb-2">Edit Permissions</h2>

//       {Object.entries(PERMISSIONS).map(([key, label]) => (
//         <label key={key} className="flex gap-2">
//           <input
//             type="checkbox"
//             checked={perms.includes(key)}
//             onChange={() => toggle(key)}
//           />
//           {label}
//         </label>
//       ))}

//       <button
//         onClick={save}
//         className="mt-3 bg-blue-600 text-white px-4 py-2"
//       >
//         Save
//       </button>
//     </div>
//   );
// }
