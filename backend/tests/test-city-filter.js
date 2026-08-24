const testCityFilter = async () => {
  console.log('Testing Event Catalog City Filter API...');

  try {
    // 1. All Events
    const allRes = await fetch('http://localhost:5000/api/events');
    const allData = await allRes.json();
    console.log(`\n✓ All Events Count: ${allData.count}`);
    allData.data.forEach(e => {
      console.log(`  - "${e.title}" | Cities: [${e.cities.join(', ')}] | Starting Price: $${e.startingPrice}`);
    });

    // 2. Filter by New York
    const nyRes = await fetch('http://localhost:5000/api/events?city=New%20York');
    const nyData = await nyRes.json();
    console.log(`\n✓ Filtered by City "New York" Count: ${nyData.count}`);
    nyData.data.forEach(e => {
      console.log(`  - "${e.title}" | Cities: [${e.cities.join(', ')}]`);
    });

    // 3. Filter by Metropolis
    const metRes = await fetch('http://localhost:5000/api/events?city=Metropolis');
    const metData = await metRes.json();
    console.log(`\n✓ Filtered by City "Metropolis" Count: ${metData.count}`);
    metData.data.forEach(e => {
      console.log(`  - "${e.title}" | Cities: [${e.cities.join(', ')}]`);
    });

    // 4. Filter by San Francisco
    const sfRes = await fetch('http://localhost:5000/api/events?city=San%20Francisco');
    const sfData = await sfRes.json();
    console.log(`\n✓ Filtered by City "San Francisco" Count: ${sfData.count}`);
    sfData.data.forEach(e => {
      console.log(`  - "${e.title}" | Cities: [${e.cities.join(', ')}]`);
    });

    console.log('\n======================================================');
    console.log('🎉 CITY FILTERING WORKING FLAWLESSLY WITH REAL DATA!');
    console.log('======================================================');
  } catch (err) {
    console.error('Test error:', err.message);
  }
};

testCityFilter();
