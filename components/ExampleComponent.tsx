"use client";

import { useGetExamplesQuery, useCreateExampleMutation } from "@/lib/api/exampleApi";
import { useState } from "react";

export function ExampleComponent() {
  const { data, isLoading, error, refetch } = useGetExamplesQuery();
  const [createExample, { isLoading: isCreating }] = useCreateExampleMutation();
  const [name, setName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await createExample({ name }).unwrap();
      setName("");
      refetch();
    } catch (err) {
      console.error("Failed to create example:", err);
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading data</div>;

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Example Component</h2>
      
      <form onSubmit={handleSubmit} className="mb-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter name"
          className="border p-2 mr-2"
        />
        <button
          type="submit"
          disabled={isCreating}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {isCreating ? "Creating..." : "Create"}
        </button>
      </form>

      <div>
        <h3 className="text-xl font-semibold mb-2">Items:</h3>
        <ul>
          {data?.map((item) => (
            <li key={item.id} className="mb-2">
              {item.name} (ID: {item.id})
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

