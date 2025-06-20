import { useEffect } from 'react';

const Disqus = () => {
  useEffect(() => {
    const d = document;
    const s = d.createElement('script');
    s.src = 'https://jjw-is-a-dev.disqus.com/embed.js';
    s.setAttribute('data-timestamp', String(+new Date()));
    (d.head || d.body).appendChild(s);
    return () => {
      // Clean up Disqus thread if needed
      const thread = d.getElementById('disqus_thread');
      if (thread) thread.innerHTML = '';
    };
  }, []);

  return (
    <>
      <div id="disqus_thread"></div>
      <noscript>
        Please enable JavaScript to view the{' '}
        <a href="https://disqus.com/?ref_noscript">comments powered by Disqus.</a>
      </noscript>
    </>
  );
};

export default Disqus;
