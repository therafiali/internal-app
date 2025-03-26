import React from 'react';

interface EntFilterTabsProps {
  userEntAccess: string[];
  selectedEnt: string;
  onEntChange: (ent: string) => void;
}

const EntFilterTabs: React.FC<EntFilterTabsProps> = ({
  userEntAccess,
  selectedEnt,
  onEntChange,
}) => {
  if (userEntAccess.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="border-b border-gray-800">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => onEntChange("All ENT")}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${
                selectedEnt === "All ENT"
                  ? "border-blue-500 text-blue-500"
                  : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300"
              }
            `}
          >
            All ENT
          </button>
          {userEntAccess.map((ent) => (
            <button
              key={ent}
              onClick={() => onEntChange(ent)}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${
                  selectedEnt === ent
                    ? "border-blue-500 text-blue-500"
                    : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300"
                }
              `}
            >
              {ent}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default EntFilterTabs; 