export default function Player({ position, isMe }) {
  return (
    <mesh position={position}>
      <boxGeometry />
      <meshStandardMaterial color={isMe ? "hotpink" : "skyblue"} />
    </mesh>
  );
}