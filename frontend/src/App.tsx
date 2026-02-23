import React, { useState, useEffect, useRef } from "react";
import { THREAT_COLOR } from "./constants";
import { useTasks, useClients, useTeam, useDomains, useScans, useActivityLog, useCmd } from "./hooks/useFirestore";
import { useAuth } from "./hooks/useAuth";
import type { Task, TeamMember } from "./types";
import { FUNCTIONS_URL } from "./firebase";

import Topbar from "./components/Topbar";
import MapView from "./components/MapView";
import BoardView from "./components/BoardView";
import NodeModal from "./components/NodeModal";
import { AddClientModal } from "./components/ui";
import LoginScreen from "./components/LoginScreen";
import IntelTab from "./components/Sidebar/IntelTab";
import SquadTab from "./components/Sidebar/SquadTab";
import LogTab from "./components/Sidebar/LogTab";
import ScanTab from "./components/Sidebar/ScanTab";
import CmdTab from "./components/Sidebar/CmdTab";

export default function App() {
  // Auth
  const { user, state: authState, error: authError, login, logout } = useAuth();

  // Firestore hooks
  const { getT, allFlat, updateTask, addTask, deleteTask } = useTasks();
  const { clients, updateClient, addClient } = useClients();
  const { team, addTeamMember } = useTeam();
  const { domains } = useDomains();
  const { scanHistory, scanning, runScan, replyScan } = useScans();
  const { actLog } = useActivityLog();
  const { loading, sendCmd } = useCmd();

  // Sync on first authenticated load
  const syncedRef = useRef(false);
  useEffect(() => {
    if (authState === "authenticated" && !syncedRef.current) {
      syncedRef.current = true;
      fetch(`${FUNCTIONS_URL}/warboardSync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actor: user?.email }),
      }).catch(err => console.error("Sync failed:", err));
    }
  }, [authState]);

  // UI state
  const [view, setView] = useState("map");
  const [mapMode, setMapMode] = useState("THREAT");
  const [discFilter, setDiscFilter] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<{ id: string; label: string; color: string; isSynthetic: boolean; syntheticTasks: Task[] | null } | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [sideTab, setSideTab] = useState("intel");

  // Board controls
  const [bGroup, setBGroup] = useState("project");
  const [bSort, setBSort] = useState("priority");
  const [bFiltP, setBFiltP] = useState<string[]>([]);
  const [bFiltS, setBFiltS] = useState<string[]>([]);
  const [bFiltA, setBFiltA] = useState<string[]>([]);
  const [bFiltD, setBFiltD] = useState<string[]>([]);
  const [bSearch, setBSearch] = useState("");

  // Derived stats
  const critCount = allFlat.filter(t => t.priority === "CRITICAL" && t.status !== "DONE").length;
  const focusCount = allFlat.filter(t => t.priority === "FOCUS" && t.status !== "DONE").length;
  const openCount = allFlat.filter(t => t.status === "OPEN").length;
  const doneCount = allFlat.filter(t => t.status === "DONE").length;
  const unassigned = allFlat.filter(t => !t.assignee).length;

  const openDrawer = (id: string, label: string, color: string, isSynthetic = false, syntheticTasks: Task[] | null = null) => setDrawer({ id, label, color, isSynthetic, syntheticTasks });

  const handleRunScan = () => { runScan(); setSideTab("scan"); };

  const handleAddClient = (cl: { id: string; label: string; x: number; y: number; threat: string; disciplines: string[]; lead: string | null; lead2: string | null }) => {
    addClient(cl);
  };

  const handleUpdateClientPos = (cid: string, x: number, y: number) => {
    updateClient(cid, "x", x);
    updateClient(cid, "y", y);
  };

  // Auth states: loading → login screen → dashboard
  if (authState === "loading") {
    return (
      <div style={{ fontFamily: "'JetBrains Mono',monospace", background: "#0d1117", color: "#5a7a8a", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, letterSpacing: 3 }}>
        AUTHENTICATING...
      </div>
    );
  }

  if (authState === "unauthenticated") {
    return <LoginScreen error={authError} onLogin={login} />;
  }

  return (
    <div style={{ fontFamily: "'JetBrains Mono','Courier New',monospace", background: "#0d1117", color: "#b8ccd8", height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", userSelect: "none" }}>
      <style>{`
        .inter{font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif!important;}
        @keyframes critPulse{0%,100%{box-shadow:0 0 0 1px rgba(255,51,51,0.7),0 0 24px rgba(255,51,51,0.3)}50%{box-shadow:0 0 0 2px rgba(255,51,51,0.95),0 0 42px rgba(255,51,51,0.5)}}
        @keyframes scan{0%{top:-4%}100%{top:106%}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes focusPulse{0%,100%{box-shadow:0 0 0 0 rgba(163,230,53,0.6)}50%{box-shadow:0 0 0 4px rgba(163,230,53,0)}}
        @keyframes slideIn{from{transform:translateX(-100%);opacity:0}to{transform:translateX(0);opacity:1}}
        @keyframes modalIn{from{transform:translate(-50%,-52%);opacity:0}to{transform:translate(-50%,-50%);opacity:1}}
        .cn{cursor:grab;transition:filter 0.15s}.cn:hover{filter:brightness(1.3)}.cn:active{cursor:grabbing}
        .dh{cursor:pointer;transition:filter 0.2s,transform 0.2s}.dh:hover{filter:brightness(1.35);transform:scale(1.06)}
        .ir{cursor:pointer;border-radius:3px;transition:background 0.1s}.ir:hover{background:rgba(123,104,238,0.06)!important}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:rgba(123,104,238,0.25);border-radius:2px}::-webkit-scrollbar-thumb:hover{background:#7B68EE}
        input:focus,select:focus,textarea:focus{outline:none}
      `}</style>

      {/* Modals */}
      {drawer && <NodeModal id={drawer.id} label={drawer.label} color={drawer.color} isSynthetic={drawer.isSynthetic}
        tasks={drawer.syntheticTasks !== null ? drawer.syntheticTasks : getT(drawer.id)} clients={clients} team={team}
        onUpdateTask={updateTask} onAddTask={addTask} onDeleteTask={deleteTask} onUpdateClient={updateClient}
        onClose={() => setDrawer(null)} />}
      {showAdd && <AddClientModal onAdd={handleAddClient} onClose={() => setShowAdd(false)} team={team} />}

      {/* Topbar */}
      <Topbar critCount={critCount} focusCount={focusCount} openCount={openCount} doneCount={doneCount}
        view={view} setView={setView} scanning={scanning} runScan={handleRunScan} />

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Main content */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          {view === "map" && (
            <MapView clients={clients} team={team} domains={domains} getT={getT} allFlat={allFlat}
              mapMode={mapMode} setMapMode={setMapMode} discFilter={discFilter} setDiscFilter={setDiscFilter}
              openDrawer={openDrawer} setShowAdd={setShowAdd} onUpdateClientPos={handleUpdateClientPos} />
          )}
          {view === "board" && (
            <BoardView clients={clients} domains={domains} team={team} getT={getT}
              updateTask={updateTask} deleteTask={deleteTask} addTask={addTask}
              bGroup={bGroup} setBGroup={setBGroup} bSort={bSort} setBSort={setBSort}
              bFiltP={bFiltP} setBFiltP={setBFiltP} bFiltS={bFiltS} setBFiltS={setBFiltS}
              bFiltA={bFiltA} setBFiltA={setBFiltA} bFiltD={bFiltD} setBFiltD={setBFiltD}
              bSearch={bSearch} setBSearch={setBSearch} threatColor={THREAT_COLOR} />
          )}
        </div>

        {/* Sidebar */}
        <div style={{ width: 280, borderLeft: "1px solid rgba(123,104,238,0.09)", display: "flex", flexDirection: "column", background: "#0d1117", flexShrink: 0 }}>
          <div style={{ display: "flex", borderBottom: "1px solid rgba(123,104,238,0.08)", flexShrink: 0 }}>
            {([["intel", "\u25C8 INTEL"], ["squad", "\u25C9 SQUAD"], ["log", "\u25F7 LOG"], ["scan", "\u2295 SCAN"], ["cmd", "\u2318 CMD"]] as const).map(([tab, label]) => (
              <button key={tab} onClick={() => setSideTab(tab)} style={{ flex: 1, padding: "7px 0", fontSize: 8, letterSpacing: 1, fontFamily: "'JetBrains Mono',monospace", background: sideTab === tab ? "rgba(123,104,238,0.1)" : "transparent", border: "none", borderBottom: sideTab === tab ? "1px solid #7B68EE" : "1px solid transparent", color: sideTab === tab ? "#7B68EE" : "#5a7a8a", cursor: "pointer", marginBottom: -1 }}>{label}</button>
            ))}
          </div>

          {sideTab === "intel" && <IntelTab domains={domains} clients={clients} team={team} getT={getT} discFilter={discFilter} setDiscFilter={setDiscFilter} openDrawer={openDrawer} setShowAdd={setShowAdd} />}
          {sideTab === "squad" && <SquadTab team={team} clients={clients} allFlat={allFlat} unassigned={unassigned} onAddTeamMember={addTeamMember} />}
          {sideTab === "log" && <LogTab actLog={actLog} />}
          {sideTab === "scan" && <ScanTab scanHistory={scanHistory} scanning={scanning} runScan={handleRunScan} replyScan={replyScan} />}
          {sideTab === "cmd" && <CmdTab loading={loading} sendCmd={sendCmd} />}
        </div>
      </div>
    </div>
  );
}
