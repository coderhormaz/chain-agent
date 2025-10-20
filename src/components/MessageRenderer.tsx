import React from 'react';

interface MessageRendererProps {
  content: string;
}

const MessageRenderer: React.FC<MessageRendererProps> = ({ content }) => {
  // Parse markdown-style text formatting (bold, links)
  const parseContent = (text: string) => {
    const parts: (string | React.ReactElement)[] = [];
    // Combined regex for links and bold text
    const markdownRegex = /(\[([^\]]+)\]\(([^)]+)\))|(\*\*([^*]+)\*\*)/g;
    let lastIndex = 0;
    let match;
    let keyCounter = 0;

    while ((match = markdownRegex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      // Check if it's a link [text](url)
      if (match[1]) {
        const linkText = match[2];
        const url = match[3];
        parts.push(
          <a
            key={`link-${keyCounter++}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="blockchain-link"
            style={{
              color: '#007bff',
              textDecoration: 'underline',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            {linkText}
          </a>
        );
      }
      // Check if it's bold text **text**
      else if (match[4]) {
        const boldText = match[5];
        parts.push(
          <strong key={`bold-${keyCounter++}`} style={{ fontWeight: '700' }}>
            {boldText}
          </strong>
        );
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts;
  };

  // Parse contract addresses and transaction hashes to make them clickable
  const parseBlockchainData = (text: string) => {
    // Match transaction hashes and contract addresses (0x followed by 40-66 hex chars)
    const addressRegex = /(`0x[a-fA-F0-9]{40,66}`)/g;
    
    return text.replace(addressRegex, (match) => {
      const cleanAddress = match.replace(/`/g, ''); // Remove backticks
      const explorerUrl = `https://opbnbscan.com/address/${cleanAddress}`;
      const shortAddress = `${cleanAddress.slice(0, 10)}...${cleanAddress.slice(-8)}`;
      return `[${shortAddress}](${explorerUrl})`;
    });
  };

  const renderLine = (line: string, index: number) => {
    // First parse blockchain data to convert addresses to links
    const processedLine = parseBlockchainData(line);
    
    // Then parse all markdown links
    const parsedContent = parseContent(processedLine);
    
    return (
      <p key={index} style={{ margin: '0.5em 0', lineHeight: '1.5' }}>
        {parsedContent.length > 0 ? parsedContent : line}
      </p>
    );
  };

  return (
    <>
      {content.split('\n').map(renderLine)}
    </>
  );
};

export default MessageRenderer;
