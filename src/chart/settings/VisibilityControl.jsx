import InputControl from "./InputControl";

const VisibilityControl = ({ item, value, onChange }) => (
  <InputControl item={{ type: "boolean", ...item }} value={value} onChange={onChange} />
);

export default VisibilityControl;
