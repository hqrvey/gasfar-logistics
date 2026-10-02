import React, { useState } from "react";
import { FiChevronDown, FiTruck } from "react-icons/fi";
import { Check, Bike, Car, CarFront, Truck, Van } from "lucide-react";

const SIGNUP_VEHICLE_TYPES = [
  { value: "motorcycle", label: "Motorcycle (max 20 kg)" },
  { value: "sedan", label: "Sedan (max 200 kg)" },
  { value: "suv", label: "SUV (max 600 kg)" },
  { value: "pickup", label: "Pickup (max 800 kg)" },
  { value: "l300", label: "L300 (max 1,000 kg)" },
];
const VEHICLE_ICONS = { motorcycle: Bike, sedan: Car, suv: CarFront, pickup: Truck, l300: Van };
const SIGNUP_VEHICLE_OPTIONS = SIGNUP_VEHICLE_TYPES.map((v) => ({
  value: v.value,
  label: v.label.split(" (")[0],
  sub: "Max " + (v.label.match(/\((.+)\)/)?.[1] || ""),
  Icon: VEHICLE_ICONS[v.value] || FiTruck,
}));

const VehicleSelect = ({ value, onChange, error = "", options = SIGNUP_VEHICLE_OPTIONS, label = "Vehicle Type", placeholder = "Select an option", placeholderIcon: PlaceholderIcon = Car }) => {
  const [open, setOpen] = useState(false);
  const opts = options || SIGNUP_VEHICLE_OPTIONS;
  const selected = opts.find((o) => o.value === value);
  const isPlaceholder = !selected;
  const SelectedIcon = selected?.Icon || PlaceholderIcon;

  return (
    <div className="vehicle-select">
      <label className="input-label">{label} <span className="required">*</span></label>
      <button type="button"
        className={`vehicle-select__trigger${error ? " vehicle-select__trigger--error" : ""}${open ? " vehicle-select__trigger--open" : ""}${isPlaceholder ? " vehicle-select__trigger--placeholder" : ""}`}
        onClick={() => setOpen((o) => !o)}>
        <span className="vehicle-select__icon" style={isPlaceholder ? { color: "#9ca3af", background: "#f3f4f6" } : undefined}>
          <SelectedIcon size={20} strokeWidth={isPlaceholder ? 2.2 : 1.8} />
        </span>
        <span className="vehicle-select__body">
          {selected ? (
            <>
              <span className="vehicle-select__label">{selected.label}</span>
              <span className="vehicle-select__sub">{selected.sub}</span>
            </>
          ) : (
            <span className="vehicle-select__placeholder" style={{ color: "#9ca3af", fontWeight: 500 }}>{placeholder}</span>
          )}
        </span>
        <FiChevronDown size={16} className={`vehicle-select__caret${open ? " open" : ""}`} />
      </button>
      {open && (
        <>
          <div className="vehicle-select__backdrop" onClick={() => setOpen(false)} />
          <div className="vehicle-select__dropdown">
            {opts.map((o) => {
              const Icon = o.Icon || FiTruck;
              const active = o.value === value;
              return (
                <button key={o.value} type="button"
                  className={`vehicle-select__option${active ? " active" : ""}`}
                  onClick={() => { onChange(o.value); setOpen(false); }}>
                  <span className="vehicle-select__option-icon"><Icon size={16} /></span>
                  <span className="vehicle-select__option-body">
                    <span className="vehicle-select__option-name">{o.label}</span>
                    <span className="vehicle-select__option-cap">{o.sub}</span>
                  </span>
                  {active && <Check size={14} className="vehicle-select__option-check" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default VehicleSelect;
