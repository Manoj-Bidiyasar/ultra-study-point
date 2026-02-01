export default function HeadingBlock({ block }) {
  const level = block.level || 2;
  const Tag = `h${level}`;

  const sizes = {
    1: "text-3xl",
    2: "text-2xl",
    3: "text-xl",
    4: "text-lg",
  };

  return (
    <Tag
      className={`
        mt-6 mb-2 font-bold
        ${sizes[level]}
        text-gray-900
      `}
    >
      {block.text}
    </Tag>
  );
}
