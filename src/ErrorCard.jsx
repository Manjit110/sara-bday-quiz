export default function ErrorCard({ message, onRetry }) {
  return (
    <div className="app">
      <div className="card">
        <h1>&#128546; Something went wrong</h1>
        <p className="subtitle">Couldn't reach Supabase.</p>
        <p className="status-msg" style={{ textAlign: "left", wordBreak: "break-word" }}>
          {message}
        </p>
        {onRetry && (
          <button className="btn-primary" onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
