import { useState } from 'react';
import { api, fmtINR, fmtNum } from '../services/api';
import { SelectField, InputField, Button } from '../components/ui/FormControls';
import { Users, Search, Target, Wallet, Car, ShoppingBag, Briefcase, CreditCard, Heart, UserCheck, AlertTriangle, Percent } from 'lucide-react';

const COUNTRIES = ['Australia','France','Germany','India','Japan','UK','USA'];
const FUELS = ['Electric','Petrol','Diesel','Hybrid'];
const TYPES = ['SUV','Sedan','Hatchback','Truck','Luxury'];

export default function Segments() {
  const [country, setCountry] = useState('India');
  const [fuelType, setFuelType] = useState('Electric');
  const [carType, setCarType] = useState('SUV');
  const [priceUsd, setPriceUsd] = useState(25000);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const predict = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.segmentPredict({ country, fuel_type: fuelType, car_type: carType, price_usd: priceUsd });
      setResult(r);
    } catch (e) {
      setResult(null);
      setError('Prediction failed. Check backend connection.');
    }
    setLoading(false);
  };

  const seg = result?.predicted_segment;

  return (
    <div className="flex flex-col gap-6">
      <div className="animate-fade-in">
        <h1 className="text-3xl md:text-4xl font-bold text-on-surface tracking-tight">Customer Segments</h1>
        <p className="text-base text-on-surface-variant mt-2">Predict buyer persona and segment using ML-driven analysis.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <div className="bg-surface-container-lowest rounded-[24px] p-6 high-depth-shadow animate-fade-in-up flex flex-col gap-5">
          <h3 className="text-lg font-semibold flex items-center gap-2"><Search size={18} className="text-primary"/>Configuration</h3>
          <SelectField label="Country" value={country} onChange={setCountry} options={COUNTRIES} />
          <SelectField label="Fuel Type" value={fuelType} onChange={setFuelType} options={FUELS} />
          <SelectField label="Car Type" value={carType} onChange={setCarType} options={TYPES} />
          <InputField label="Price (USD)" value={priceUsd} onChange={setPriceUsd} min={5000} max={200000} step={1000} />
          <Button onClick={predict} icon={Target} disabled={loading}>{loading ? 'Analyzing...' : 'Predict Segment'}</Button>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{error}</p>}
        </div>

        {/* Results Panel */}
        <div className="flex flex-col gap-6">
          {seg ? (
            <>
              {/* Main Persona Card */}
              <div className="bg-surface-container-lowest rounded-[24px] p-6 high-depth-shadow animate-fade-in-up">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-primary-fixed flex items-center justify-center">
                    <Users size={24} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-on-surface">Buyer Persona Analysis</h3>
                    <p className="text-sm text-on-surface-variant">{result.country} · {result.fuel_type} · {result.car_type}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <PersonaStat icon={Users} label="Age Group" value={seg.age_group} />
                  <PersonaStat icon={Wallet} label="Income Level" value={seg.income_group} />
                  <PersonaStat icon={Briefcase} label="Profession" value={seg.profession} />
                  <PersonaStat icon={CreditCard} label="Payment Mode" value={seg.payment_mode} />
                </div>
              </div>

              {/* Engagement Metrics */}
              <div className="bg-surface-container-lowest rounded-[24px] p-6 high-depth-shadow animate-fade-in-up" style={{animationDelay:'0.1s'}}>
                <h4 className="text-base font-semibold text-on-surface mb-4">Engagement Metrics</h4>
                <div className="grid grid-cols-2 gap-4">
                  <MetricBar icon={Heart} label="Loyalty Score" value={seg.loyalty_score} color="bg-primary" />
                  <MetricBar icon={Car} label="Test Drive Prob." value={seg.test_drive_prob} color="bg-[#0d9488]" />
                  <MetricBar icon={UserCheck} label="First-Time Buyer" value={seg.first_time_buyer_prob} color="bg-[#7c3aed]" />
                  <div className="p-3 rounded-xl bg-surface border border-outline-variant/20">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle size={14} className={seg.churn_risk === 'Low' ? 'text-success' : 'text-warning'} />
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">Churn Risk</span>
                    </div>
                    <p className={`text-base font-bold ${seg.churn_risk === 'Low' ? 'text-success' : 'text-warning'}`}>{seg.churn_risk}</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-surface-container-lowest rounded-[24px] p-12 high-depth-shadow flex items-center justify-center text-on-surface-variant animate-fade-in">
              <div className="text-center">
                <Users size={40} className="mx-auto mb-4 text-outline-variant" />
                <p className="text-lg font-medium">Select parameters and predict</p>
                <p className="text-sm mt-1">Our ML model will identify the buyer persona for your configuration.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PersonaStat({ icon: Icon, label, value }) {
  return (
    <div className="p-3 rounded-xl bg-surface border border-outline-variant/20">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} className="text-primary" />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">{label}</span>
      </div>
      <p className="text-base font-bold text-on-surface">{value}</p>
    </div>
  );
}

function MetricBar({ icon: Icon, label, value, color }) {
  const pct = Math.round((value || 0) * 100);
  return (
    <div className="p-3 rounded-xl bg-surface border border-outline-variant/20">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} className="text-primary" />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">{label}</span>
      </div>
      <p className="text-base font-bold text-on-surface mb-1">{pct}%</p>
      <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{width: `${pct}%`}} />
      </div>
    </div>
  );
}
