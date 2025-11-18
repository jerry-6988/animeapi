// api/hianime.js - Simple HiAnime API for Vercel
// Place this file in /api folder of your Vercel project

import * as cheerio from 'cheerio';

const BASE_URL = 'https://hianime.to';

// Helper function to make requests with proper headers
async function fetchFromHiAnime(path) {
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': BASE_URL,
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.text();
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}

// Parse homepage
async function getHomePage() {
  const html = await fetchFromHiAnime('/home');
  const $ = cheerio.load(html);
  
  const spotlight = [];
  $('.deslide-item').each((i, el) => {
    spotlight.push({
      id: $(el).find('a').attr('href')?.split('/').pop() || '',
      title: $(el).find('.deslide-item-content h2').text().trim(),
      description: $(el).find('.deslide-item-content .sc-desc').text().trim(),
      poster: $(el).find('.deslide-cover img').attr('src') || '',
      rank: i + 1,
    });
  });
  
  const trending = [];
  $('#trending-home .film_list-wrap .flw-item').each((i, el) => {
    trending.push({
      id: $(el).find('a.film-poster').attr('href')?.split('/').pop() || '',
      title: $(el).find('.film-name').text().trim(),
      poster: $(el).find('.film-poster-img').attr('data-src') || '',
      type: $(el).find('.fdi-item:first').text().trim(),
      duration: $(el).find('.fdi-duration').text().trim(),
    });
  });
  
  return {
    success: true,
    data: {
      spotlight,
      trending,
      timestamp: new Date().toISOString(),
    },
  };
}

// Search anime
async function searchAnime(query, page = 1) {
  const html = await fetchFromHiAnime(`/search?keyword=${encodeURIComponent(query)}&page=${page}`);
  const $ = cheerio.load(html);
  
  const results = [];
  $('.flw-item').each((i, el) => {
    results.push({
      id: $(el).find('a.film-poster').attr('href')?.split('/').pop() || '',
      title: $(el).find('.film-name').text().trim(),
      poster: $(el).find('.film-poster-img').attr('data-src') || '',
      type: $(el).find('.fdi-item:first').text().trim(),
      duration: $(el).find('.fdi-duration').text().trim(),
      episodes: {
        sub: parseInt($(el).find('.tick-sub').text()) || 0,
        dub: parseInt($(el).find('.tick-dub').text()) || 0,
      },
    });
  });
  
  return {
    success: true,
    data: {
      results,
      currentPage: page,
      query,
    },
  };
}

// Get anime details
async function getAnimeDetails(animeId) {
  const html = await fetchFromHiAnime(`/${animeId}`);
  const $ = cheerio.load(html);
  
  return {
    success: true,
    data: {
      id: animeId,
      title: $('.film-name').text().trim(),
      poster: $('.film-poster-img').attr('src') || '',
      description: $('.film-description').text().trim(),
      type: $('.item-title:contains("Type:")').next().text().trim(),
      status: $('.item-title:contains("Status:")').next().text().trim(),
      genres: $('.item-list a').map((i, el) => $(el).text().trim()).get(),
      episodes: {
        sub: parseInt($('.tick-sub').text()) || 0,
        dub: parseInt($('.tick-dub').text()) || 0,
      },
    },
  };
}

// API Handler
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    const { action, query, page, id } = req.query;
    
    switch (action) {
      case 'home':
        const homeData = await getHomePage();
        return res.status(200).json(homeData);
        
      case 'search':
        if (!query) {
          return res.status(400).json({
            success: false,
            error: 'Query parameter required',
          });
        }
        const searchData = await searchAnime(query, parseInt(page) || 1);
        return res.status(200).json(searchData);
        
      case 'details':
        if (!id) {
          return res.status(400).json({
            success: false,
            error: 'ID parameter required',
          });
        }
        const detailsData = await getAnimeDetails(id);
        return res.status(200).json(detailsData);
        
      default:
        return res.status(200).json({
          success: true,
          message: 'HiAnime API - Available endpoints',
          endpoints: [
            {
              path: '/api/hianime?action=home',
              description: 'Get homepage content',
            },
            {
              path: '/api/hianime?action=search&query=naruto&page=1',
              description: 'Search anime',
            },
            {
              path: '/api/hianime?action=details&id=naruto-20',
              description: 'Get anime details',
            },
          ],
        });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}

// Note: To use this in Vercel:
// 1. Create a new Vercel project
// 2. Create /api folder
// 3. Save this as /api/hianime.js
// 4. Add package.json with cheerio dependency
// 5. Deploy!
//
// package.json example:
// {
//   "dependencies": {
//     "cheerio": "^1.0.0-rc.12"
//   }
// }
//
// Usage examples:
// GET /api/hianime?action=home
// GET /api/hianime?action=search&query=one+piece&page=1
// GET /api/hianime?action=details&id=one-piece-100