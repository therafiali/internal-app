import Image from "next/image";

interface AgentInfoProps {
  agentName: string;
  agentImage?: string;
  employeeCode?: string;
}

export const AgentInfo = ({ agentName, agentImage, employeeCode }: AgentInfoProps) => {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-shrink-0 h-8 w-8">
       {agentImage ?  <Image
          className="h-8 w-8 rounded-full object-cover border border-gray-700"
          src={  agentImage }
          alt={`${agentName}'s profile`}
          width={32}
          height={32}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y";
          }}
        />: null}
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-medium text-gray-300">{agentName}</span>
        {employeeCode && (
          <span className="text-xs text-gray-400">{employeeCode}</span>
        )}
      </div>
    </div>
  );
};