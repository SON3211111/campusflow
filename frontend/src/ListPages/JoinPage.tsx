import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import client from "../api/client";

export default function JoinPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const workspaceId = searchParams.get("workspaceId");
  const [status, setStatus] = useState<"joining" | "success" | "error">("joining");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      navigate(`/login?redirect=/join?workspaceId=${workspaceId}`);
      return;
    }
    if (!workspaceId) {
      setStatus("error");
      setMsg("잘못된 초대 링크입니다.");
      return;
    }
    client.post(`/workspaces/${workspaceId}/join?userId=${userId}`)
      .then(() => {
        setStatus("success");
        setMsg("참여 완료! 워크스페이스로 이동합니다.");
        setTimeout(() => navigate("/workspace"), 1500);
      })
      .catch(() => {
        setStatus("error");
        setMsg("참여에 실패했습니다. 링크를 확인해주세요.");
      });
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", gap: 16 }}>
      {status === "joining" && <p>워크스페이스 참여 중...</p>}
      {status === "success" && <p style={{ color: "#4f7cff", fontWeight: 600 }}>{msg}</p>}
      {status === "error" && (
        <>
          <p style={{ color: "#e53935", fontWeight: 600 }}>{msg}</p>
          <button onClick={() => navigate("/workspace")} style={{ padding: "8px 20px", borderRadius: 8, background: "#4f7cff", color: "#fff", border: "none", cursor: "pointer" }}>홈으로</button>
        </>
      )}
    </div>
  );
}
