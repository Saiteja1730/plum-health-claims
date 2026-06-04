"use client";

import { ClaimHistory } from "../types/claim";

interface Props {
  claims: ClaimHistory[];
}

export default function HistoryTable({
  claims
}: Props) {

  return (

    <div className="bg-white shadow-lg rounded-xl overflow-hidden">

      <table className="w-full">

        <thead className="bg-blue-600 text-white">

          <tr>

            <th className="p-3 text-left">
              Member
            </th>

            <th className="p-3 text-left">
              Diagnosis
            </th>

            <th className="p-3 text-left">
              Amount
            </th>

            <th className="p-3 text-left">
              Decision
            </th>

          </tr>

        </thead>

        <tbody>

          {
            claims.map(
              (claim, index) => (

                <tr
                  key={index}
                  className="border-b hover:bg-gray-50"
                >

                  <td className="p-3">
                    {claim.member_name}
                  </td>

                  <td className="p-3">
                    {claim.diagnosis}
                  </td>

                  <td className="p-3">
                    ₹{claim.claim_amount}
                  </td>

                  <td className="p-3">

                    <span
                      className={`
                      px-3
                      py-1
                      rounded-full
                      text-white
                      ${
                        claim.decision === "APPROVED"
                          ? "bg-green-500"
                          : claim.decision === "REJECTED"
                          ? "bg-red-500"
                          : claim.decision === "PARTIAL"
                          ? "bg-yellow-500"
                          : "bg-orange-500"
                      }
                      `}
                    >
                      {claim.decision}
                    </span>

                  </td>

                </tr>

              )
            )
          }

        </tbody>

      </table>

    </div>
  );
}