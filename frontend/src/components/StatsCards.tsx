interface Props {

  totalClaims: number;

  approved: number;

  rejected: number;

  partial: number;

  manualReview: number;

  approvalRate: number;
}

export default function StatsCards({

  totalClaims,

  approved,

  rejected,

  partial,

  manualReview,

  approvalRate

}: Props) {

  const cards = [

    {
      title: "Total Claims",
      value: totalClaims
    },

    {
      title: "Approved",
      value: approved
    },

    {
      title: "Rejected",
      value: rejected
    },

    {
      title: "Partial",
      value: partial
    },

    {
      title: "Manual Review",
      value: manualReview
    },

    {
      title: "Approval Rate %",
      value: approvalRate
    }
  ];

  return (

    <div
      className="
      grid
      grid-cols-1
      md:grid-cols-2
      lg:grid-cols-3
      gap-6
      "
    >

      {
        cards.map(
          (card) => (

            <div

              key={card.title}

              className="
              bg-white
              rounded-xl
              shadow-lg
              p-6
              border
              hover:shadow-xl
              transition
              "
            >

              <h3
                className="
                text-gray-500
                text-sm
                uppercase
                "
              >
                {card.title}
              </h3>

              <p
                className="
                text-3xl
                font-bold
                mt-2
                text-blue-600
                "
              >
                {card.value}
              </p>

            </div>

          )
        )
      }

    </div>
  );
}