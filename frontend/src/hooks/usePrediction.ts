import { useState } from 'react';
import { floodAPI, PredictionInput, PredictionResponse } from '../services/api';

export function usePrediction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);

  const predict = async (data: PredictionInput) => {
    setLoading(true);
    setError(null);
    try {
      const result = await floodAPI.predictFloodRisk(data);
      setPrediction(result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Prediction failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { predict, prediction, loading, error };
}