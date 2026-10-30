import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page">
      <h1 className="page-title">That title isn’t here</h1>
      <p className="lede">The shelf doesn’t have a match for this link.</p>
      <Link href="/" className="btn btn-primary">
        Back to Home
      </Link>
    </div>
  );
}
