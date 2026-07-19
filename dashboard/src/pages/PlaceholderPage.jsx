export default function PlaceholderPage({ title }) {
  return (
    <div>
      <h2 className="font-heading text-xl font-bold mb-6">{title}</h2>
      <div className="border border-border rounded p-10 text-center">
        <p className="font-body text-muted text-sm">Coming soon.</p>
      </div>
    </div>
  );
}
