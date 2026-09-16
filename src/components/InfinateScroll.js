import React, { useState, useEffect, useRef } from 'react';

function InfiniteScroll() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true); // Indicates if there are more pages to load
  const loaderRef = useRef(null);

  const fetchItems = async () => {
    setIsLoading(true);
    // Simulate API call
    const newItems = await new Promise(resolve =>
      setTimeout(() => {
        const startIndex = (page - 1) * 10;
        const endIndex = startIndex + 10;
        const generatedItems = Array.from({ length: 10 }, (_, i) => `Item ${startIndex + i + 1}`);
        resolve(generatedItems);
      }, 1000)
    );

    setItems(prevItems => [...prevItems, ...newItems]);
    setIsLoading(false);
    // You would determine hasMore based on your API response
    if (page >= 5) { // Example: stop after 5 pages
      setHasMore(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [page]); // Re-fetch when page changes

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      const target = entries[0];
      if (target.isIntersecting && !isLoading && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    }, { threshold: 1.0 }); // Trigger when 100% of the loader is visible

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => {
      if (loaderRef.current) {
        observer.unobserve(loaderRef.current);
      }
    };
  }, [isLoading, hasMore]); // Re-run effect when loading or hasMore changes

  return (
    <div>
      {items.map((item, index) => (
        <div key={index} style={{ height: '100px', border: '1px solid gray', margin: '10px' }}>
          {item}
        </div>
      ))}
      {hasMore && (
        <div ref={loaderRef} style={{ textAlign: 'center', padding: '20px' }}>
          {isLoading ? 'Loading...' : 'Scroll down to load more'}
        </div>
      )}
      {!hasMore && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          No more items to load.
        </div>
      )}
    </div>
  );
}

export default InfiniteScroll;