"use client";

import { useState } from "react";

import {
  uploadDocument
} from "../services/api";

import LoadingSpinner from "./LoadingSpinner";

import DecisionCard from "./DecisionCard";

export default function UploadForm() {

  const [file, setFile] =
    useState<File | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [result, setResult] =
    useState<any>(null);

  const handleUpload = async () => {

    if (!file) return;

    try {

      setLoading(true);

      const response =
        await uploadDocument(file);

      setResult(response);

    } catch (error) {

      console.error(error);

      alert(
        "Upload Failed"
      );

    } finally {

      setLoading(false);

    }
  };

  return (

    <div
      className="
      bg-white
      rounded-xl
      shadow-lg
      p-8
      "
    >

      <h2
        className="
        text-2xl
        font-bold
        mb-6
        "
      >
        Upload Medical Document
      </h2>

      <input
        type="file"
        accept=".pdf"
        onChange={(e) =>
          setFile(
            e.target.files?.[0] || null
          )
        }
        className="mb-4"
      />

      <button

        onClick={handleUpload}

        className="
        bg-blue-600
        text-white
        px-6
        py-3
        rounded-lg
        hover:bg-blue-700
        "
      >

        Upload & Process

      </button>

      {
        loading &&
        <LoadingSpinner />
      }

      {
        result &&
        (
          <div className="mt-8">

            <DecisionCard

              decision={
                result.decision.decision
              }

              approvedAmount={
                result.decision
                  .approved_amount
              }

              reasons={
                result.decision
                  .rejection_reasons
              }

            />

          </div>
        )
      }

    </div>
  );
}