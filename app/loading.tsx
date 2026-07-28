// app/loading.tsx
import MuditSpinner from "@/components/basics/MuditSpinner";

export default function Loading() {
  return (
        <div style={{ display: "flex", height: "100vh", alignItems: "flex-start", justifyContent: "center", paddingTop: "30vh" }}>
        <MuditSpinner />
        </div>
  );
}