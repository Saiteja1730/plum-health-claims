"use client";

import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="bg-blue-600 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">

        <h1 className="text-xl font-bold">
          Plum OPD Adjudication
        </h1>

        <div className="flex gap-6">

          <Link href="/">
            Home
          </Link>

          <Link href="/dashboard">
            Dashboard
          </Link>

          <Link href="/upload">
            Upload Claim
          </Link>

          <Link href="/history">
            History
          </Link>

        </div>

      </div>
    </nav>
  );
}