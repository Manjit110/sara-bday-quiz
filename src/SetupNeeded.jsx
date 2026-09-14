export default function SetupNeeded() {
  return (
    <div className="app">
      <div className="card">
        <h1>&#128295; Almost there!</h1>
        <p className="subtitle">
          This quiz needs to be connected to a Supabase project before anyone can play.
        </p>
        <p className="status-msg" style={{ textAlign: "left" }}>
          Fill in <code>SUPABASE_URL</code> and <code>SUPABASE_ANON_KEY</code> in{" "}
          <code>src/config.js</code>, then commit and push — see the README for the
          full setup steps.
        </p>
      </div>
    </div>
  );
}
