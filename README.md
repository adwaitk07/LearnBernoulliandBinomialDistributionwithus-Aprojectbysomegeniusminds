'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import IntroAnimation from './intro-animation';
import ParameterControls from './parameter-controls';
import ProbabilityChart from './probability-chart';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { suggestOptimalParameters } from '@/app/actions';
import {
  binomialPmf,
  bernoulliPmf,
  poissonPmf,
  normalPdf,
} from '@/lib/calculations';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { ArrowDown } from 'lucide-react';
import AnimatedBackground from './animated-background';
import { PlaceHolderImages } from '@/lib/placeholder-images';

type ChartDataPoint = {
  k: number;
  pmf: number;
  simulation?: number;
  normal?: number;
  poisson?: number;
};

export default function ProbabilityExplorer() {
  const [isMounted, setIsMounted] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [distribution, setDistribution] = useState('binomial');
  const [n, setN] = useState(10);
  const [p, setP] = useState(0.5);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  
  const explorerRef = useRef<HTMLDivElement>(null);

  const debouncedN = useDebounce(n, 300);
  const debouncedP = useDebounce(p, 300);
  const { toast } = useToast();
  
  const jacobBernoulliImage = PlaceHolderImages.find(img => img.id === 'jacob-bernoulli');

  useEffect(() => {
    setIsMounted(true);
    const introTimer = setTimeout(() => setShowIntro(false), 4000);
    return () => clearTimeout(introTimer);
  }, []);

  const handleScrollToExplorer = () => {
    explorerRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (distribution === 'binomial') {
      const getSuggestion = async () => {
        // Use the debounced values for the AI suggestion API call
        const suggestion = await suggestOptimalParameters({ n: debouncedN, p: debouncedP });
        setAiSuggestion(suggestion);
      };
      getSuggestion();
    } else {
      setAiSuggestion('');
    }
  }, [debouncedN, debouncedP, distribution]);
  
  const theoreticalData = useMemo(() => {
    const data: ChartDataPoint[] = [];
    // Use the debounced values for heavy calculations
    const currentN = n;
    const currentP = p;

    if (distribution === 'bernoulli') {
      for (let k = 0; k <= 1; k++) {
        data.push({ k, pmf: bernoulliPmf(k, currentP) });
      }
    } else {
      const lambda = currentN * currentP;
      const mu = currentN * currentP;
      const sigma = Math.sqrt(currentN * currentP * (1 - currentP));

      for (let k = 0; k <= currentN; k++) {
        data.push({
          k,
          pmf: binomialPmf(k, currentN, currentP),
          normal: normalPdf(k, mu, sigma),
          poisson: poissonPmf(k, lambda),
        });
      }
    }
    return data;
  }, [n, p, distribution]);
  
  const debouncedTheoreticalData = useDebounce(theoreticalData, 300);


  useEffect(() => {
    setChartData(debouncedTheoreticalData);
  }, [debouncedTheoreticalData]);
  
  const handleRunSimulation = () => {
    setIsSimulating(true);
    // Use setTimeout to avoid blocking the main thread and allow UI to update
    setTimeout(() => {
        const simulationCount = 1000;
        const outcomes: { [key: number]: number } = {};

        for(let k = 0; k <= (distribution === 'binomial' ? n : 1); k++) {
            outcomes[k] = 0;
        }

        if (distribution === 'bernoulli') {
            for (let i = 0; i < simulationCount; i++) {
                if (Math.random() < p) outcomes[1]++;
                else outcomes[0]++;
            }
        } else { // Binomial
            for (let i = 0; i < simulationCount; i++) {
                let successes = 0;
                for (let j = 0; j < n; j++) {
                    if (Math.random() < p) successes++;
                }
                if(outcomes[successes] !== undefined) {
                    outcomes[successes]++;
                }
            }
        }

        const simulatedData = debouncedTheoreticalData.map(d => ({
            ...d,
            simulation: (outcomes[d.k] || 0) / simulationCount
        }));

        setChartData(simulatedData);
        setIsSimulating(false);
        toast({
            title: 'Simulation Complete',
            description: `Ran ${simulationCount} trials successfully.`,
        });
    }, 50);
  };

  const handleExport = () => {
    if (chartData.length === 0) {
      toast({
        title: 'No Data to Export',
        description: 'Generate some data before exporting.',
        variant: 'destructive',
      });
      return;
    }
    const headers = ['k', 'theoretical_pmf', 'simulation', 'normal_approx', 'poisson_approx'];
    const csvContent = [
      headers.join(','),
      ...chartData.map(row => [row.k, row.pmf, row.simulation || 0, row.normal || 0, row.poisson || 0].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `probability_data_${distribution}_n${n}_p${p.toFixed(2)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Export Successful', description: 'Your data has been downloaded.' });
  };

  if (!isMounted) return <IntroAnimation show={true} />;

  return (
    <>
      <IntroAnimation show={showIntro} />
      <AnimatedBackground />
      <div className="min-h-screen w-full px-4 py-8 md:px-8 lg:py-12 relative z-10 transition-opacity duration-1000" style={{ opacity: showIntro ? 0 : 1 }}>
        <div className="mx-auto max-w-7xl">
            <header className="text-center mb-16 min-h-[80vh] flex flex-col justify-center items-center">
              <h1 className="font-serif text-5xl font-bold tracking-tight text-primary sm:text-6xl lg:text-7xl">
                Probability Explorer
              </h1>
              <p className="mt-4 max-w-2xl text-lg text-foreground/80">
                An interactive tool to demystify the concepts of Bernoulli and Binomial distributions.
              </p>
              <Button onClick={handleScrollToExplorer} className="mt-8" size="lg">
                Start Exploring
                <ArrowDown className="ml-2 h-5 w-5 animate-bounce" />
              </Button>
            </header>

            <div className="space-y-12 bg-card/80 backdrop-blur-sm rounded-2xl p-4 md:p-8">
              <Card className="bg-transparent border-none shadow-none">
                <CardHeader>
                  <CardTitle className="font-serif text-3xl text-primary">A Tale of Coins, Dice, and Data</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 text-lg">
                  <div className="flex flex-col md:flex-row gap-8 items-start">
                    {jacobBernoulliImage && (
                       <div className="w-full md:w-1/3 flex-shrink-0">
                         <Image
                           src={jacobBernoulliImage.imageUrl}
                           alt={jacobBernoulliImage.description}
                           width={400}
                           height={500}
                           className="rounded-lg shadow-lg object-cover"
                           data-ai-hint={jacobBernoulliImage.imageHint}
                         />
                       </div>
                    )}
                    <div className="flex-grow">
                      <h3 className="font-semibold text-2xl mb-2">The Gambling Scholar</h3>
                      <p className="text-foreground/90">
                        Our story begins in the 17th century with the brilliant Swiss mathematician, Jacob Bernoulli. He was fascinated by games of chance. While others saw just luck, Bernoulli saw patterns and mathematics. He spent nearly 20 years of his life studying probability, and his work, published after his death, laid the foundation for what we now know as the Bernoulli trial.
                      </p>
                       <p className="text-foreground/90 mt-2">
                        <span className="font-semibold text-primary">A Fun Fact:</span> Jacob came from a family of gifted mathematicians, but also a very competitive one! The Bernoullis were known for their fierce rivalries, often posing challenges to one another and sometimes even stealing each other's ideas. Thankfully, Jacob's work on probability was uniquely his.
                      </p>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-2xl text-primary mb-2">From One Trial to Many</h3>
                    <p className="text-foreground/90">
                      The Bernoulli distribution is the simplest of all. It answers the question for a single event: will it be a success or a failure? Think of a single coin flip. But what if you flip that coin multiple times? This is where the Binomial distribution comes in, generalizing Bernoulli's idea to multiple trials. It allows us to calculate the probability of a specific number of successes in a set number of attempts.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-transparent border-none shadow-none">
                <CardHeader>
                  <CardTitle className="font-serif text-3xl">Understanding the Building Blocks</CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-8 text-lg">
                  <div>
                    <h3 className="font-semibold text-2xl text-primary mb-2">Bernoulli Distribution</h3>
                    <p className="text-foreground/90">
                      Imagine flipping a single coin. A Bernoulli trial is a random experiment with exactly two possible outcomes: "success" and "failure." The Bernoulli distribution models the probability of getting one of these outcomes in a single trial.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-2xl text-primary mb-2">Binomial Distribution</h3>
                    <p className="text-foreground/90">
                      Now, what if you flip that coin 10 times? The Binomial distribution helps us find the probability of getting a certain number of successes (e.g., exactly 7 heads) in a fixed number of independent Bernoulli trials.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-transparent border-none shadow-none">
                 <CardHeader>
                  <CardTitle className="font-serif text-3xl">Why Are They Important?</CardTitle>
                  <CardDescription className="text-lg">Real-world applications of these distributions.</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-8 text-lg">
                  <div>
                    <h3 className="font-semibold text-xl mb-2">Quality Control</h3>
                    <p className="text-foreground/90">
                      A factory produces light bulbs. Each bulb is either defective (failure) or not (success). The Binomial distribution can calculate the probability of finding a certain number of defective bulbs in a batch.
                    </p>
                  </div>
                   <div>
                    <h3 className="font-semibold text-xl mb-2">Medical Trials</h3>
                    <p className="text-foreground/90">
                      In a clinical trial, a new drug either works on a patient (success) or it doesn't (failure). The Binomial distribution helps researchers determine the drug's effectiveness by analyzing how many patients responded positively.
                    </p>
                  </div>
                   <div>
                    <h3 className="font-semibold text-xl mb-2">A/B Testing in Marketing</h3>
                    <p className="text-foreground/90">
                      When a company tests two versions of a website, a user either clicks the "buy" button (success) or they don't (failure). This helps determine which version is more effective at driving sales.
                    </p>
                  </div>
                   <div>
                    <h3 className="font-semibold text-xl mb-2">Genetics</h3>
                    <p className="text-foreground/90">
                      The probability of inheriting a specific gene from a parent can be modeled as a Bernoulli trial. The Binomial distribution can then predict the likelihood of a certain number of offspring inheriting that gene.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div ref={explorerRef} id="explorer" className="grid grid-cols-1 lg:grid-cols-3 lg:gap-8 space-y-8 lg:space-y-0 pt-24">
                <div className="lg:col-span-1">
                    <ParameterControls
                        distribution={distribution}
                        setDistribution={setDistribution}
                        n={n}
                        setN={setN}
                        p={p}
                        setP={setP}
                        runSimulation={handleRunSimulation}
                        exportData={handleExport}
                        aiSuggestion={aiSuggestion}
                        isSimulating={isSimulating}
                    />
                </div>
                <div className="lg:col-span-2">
                    <ProbabilityChart data={chartData} distribution={distribution} />
                </div>
            </div>
        </div>
      </div>
    </>
  );
}
