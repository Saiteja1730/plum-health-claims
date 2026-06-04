import UploadForm from "../../components/UploadForm";

export default function UploadPage() {

  return (

    <div
      className="
      max-w-4xl
      mx-auto
      p-8
      "
    >

      <h1
        className="
        text-3xl
        font-bold
        mb-8
        "
      >
        Upload Claim Document
      </h1>

      <UploadForm />

    </div>
  );
}