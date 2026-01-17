interface Alert {
  id: string;
  severity: string;
  score: number;
  description: string;
  acknowledged: boolean;
  createdAt: Date;
}

interface AlertCardProps {
  alert: Alert;
  onAcknowledge?: (id: string) => void;
}

export function AlertCard({ alert, onAcknowledge }: AlertCardProps) {
  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'EXTREME':
        return 'bg-red-900/30 border-red-500';
      case 'HIGH':
        return 'bg-orange-900/30 border-orange-500';
      case 'MEDIUM':
        return 'bg-yellow-900/30 border-yellow-500';
      default:
        return 'bg-blue-900/30 border-blue-500';
    }
  };

  return (
    <div
      className={`rounded-lg border-l-4 p-4 ${getSeverityStyles(alert.severity)} ${
        alert.acknowledged ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded ${
                alert.severity === 'EXTREME'
                  ? 'bg-red-600'
                  : alert.severity === 'HIGH'
                    ? 'bg-orange-500'
                    : alert.severity === 'MEDIUM'
                      ? 'bg-yellow-500'
                      : 'bg-blue-500'
              }`}
            >
              {alert.severity}
            </span>
            <span className="text-sm text-gray-400">
              Score: {alert.score.toFixed(0)}
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-200">{alert.description}</p>
          <p className="mt-1 text-xs text-gray-500">
            {new Date(alert.createdAt).toLocaleString()}
          </p>
        </div>
        {!alert.acknowledged && onAcknowledge && (
          <button
            onClick={() => onAcknowledge(alert.id)}
            className="ml-4 px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
