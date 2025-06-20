import { DiscussionEmbed } from 'disqus-react';

const Disqus = () => {
  // Example static config; replace with dynamic values if needed
  const disqusShortname = 'jjw-is-a-dev';
  const disqusConfig = {
    url: window.location.href,
    identifier: window.location.pathname,
    title: document.title,
    language: 'en',
  };

  return <DiscussionEmbed shortname={disqusShortname} config={disqusConfig} />;
};

export default Disqus;
