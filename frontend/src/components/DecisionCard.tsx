interface Props {
  decision: string;
  approvedAmount?: number;
  reasons?: string[];
}

export default function DecisionCard({
  decision,
  approvedAmount,
  reasons
}: Props) {

  const getColor = () => {

    switch (decision) {

      case "APPROVED":
        return "bg-green-100 border-green-500 text-green-700";

      case "REJECTED":
        return "bg-red-100 border-red-500 text-red-700";

      case "PARTIAL":
        return "bg-yellow-100 border-yellow-500 text-yellow-700";

      case "MANUAL_REVIEW":
        return "bg-orange-100 border-orange-500 text-orange-700";

      default:
        return "bg-gray-100 border-gray-500 text-gray-700";
    }
  };

  return (

    <div
      className={`border-l-8 rounded-xl p-6 shadow-md ${getColor()}`}
    >

      <h2 className="text-2xl font-bold mb-2">
        {decision}
      </h2>

      <p className="text-lg">
        Approved Amount:
        <span className="font-bold ml-2">
          ₹{approvedAmount ?? 0}
        </span>
      </p>

      {
        reasons &&
        reasons.length > 0 &&
        (
          <div className="mt-4">

            <h3 className="font-semibold">
              Reasons
            </h3>

            <ul className="list-disc ml-5 mt-2">

              {
                reasons.map(
                  (reason, index) => (
                    <li key={index}>
                      {reason}
                    </li>
                  )
                )
              }

            </ul>

          </div>
        )
      }

    </div>
  );
}