
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icon } from "lucide-react";

interface AttackModuleCardProps {
  title: string;
  description: string;
  icon: Icon;
  difficulty: "easy" | "medium" | "hard";
  onClick: () => void;
  disabled?: boolean;
}

const AttackModuleCard = ({
  title,
  description,
  icon: IconComponent,
  difficulty,
  onClick,
  disabled = false,
}: AttackModuleCardProps) => {
  const getDifficultyColor = () => {
    switch (difficulty) {
      case "easy":
        return "bg-green-600";
      case "medium":
        return "bg-yellow-500";
      case "hard":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <Card className={`hover:border-cyber-blue transition-all duration-200 ${disabled ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center">
            <div className="mr-3 w-8 h-8 rounded-full bg-cyber-gray flex items-center justify-center">
              <IconComponent className="h-4 w-4 text-cyber-blue" />
            </div>
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          <Badge className={getDifficultyColor()}>{difficulty}</Badge>
        </div>
      </CardHeader>
      <CardContent className="text-sm">
        <p className="text-muted-foreground">
          Click to configure and launch this attack module.
        </p>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={onClick} 
          disabled={disabled}
          className="w-full bg-cyber-gray hover:bg-cyber-blue"
        >
          Configure Attack
        </Button>
      </CardFooter>
    </Card>
  );
};

export default AttackModuleCard;
