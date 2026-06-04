interface Props {
  message: string;
}

export default function ErrorMessage({
  message
}: Props) {

  return (

    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">

      <strong>Error:</strong>

      <p>{message}</p>

    </div>

  );
}