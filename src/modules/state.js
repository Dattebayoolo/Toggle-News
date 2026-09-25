// Centralized Reactive State Manager for Toggle News

const STORAGE_KEYS = {
  THEME: 'toggle_news_theme',
  DIET_HISTORY: 'toggle_news_diet_history',
  BOOKMARKS: 'toggle_news_bookmarks',
  POLLS: 'toggle_news_polls',
  ACCOUNT: 'toggle_news_account',
  EDITION: 'toggle_news_edition',
  NEWSLETTERS: 'toggle_news_newsletters',
  FOLLOWED_TOPICS: 'toggle_news_followed_topics',
  LOCAL_CITY: 'toggle_news_local_city'
};

class StateManager {
  constructor() {
    this.listeners = new Set();
    this.state = {
      theme: localStorage.getItem(STORAGE_KEYS.THEME) || 'dark',
      activeView: 'feed', // 'feed' | 'matrix' | 'blindspots' | 'directory' | 'diet'
      activeCategory: 'All',
      blindspotFilter: 'all', // 'all' | 'left-blindspots' | 'right-blindspots' | 'balanced'
      searchQuery: '',
      selectedStoryId: null,
      globalPerspective: 'balanced', // 'balanced' | 'left' | 'center' | 'right'
      storyPerspectives: {}, // storyId -> 'balanced' | 'left' | 'center' | 'right'
      spectrumValue: 50, // 0 = 100% Left, 50 = Neutral/Balanced, 100 = 100% Right
      dietHistory: this.loadJSON(STORAGE_KEYS.DIET_HISTORY, [
        { storyId: 'story-ai-antitrust', bias: 'Left', timestamp: Date.now() - 3600000 },
        { storyId: 'story-climate-lawsuit', bias: 'Left', timestamp: Date.now() - 7200000 },
        { storyId: 'story-fed-rates', bias: 'Center', timestamp: Date.now() - 10800000 },
        { storyId: 'story-defense-drone-contract', bias: 'Right', timestamp: Date.now() - 14400000 }
      ]),
      bookmarks: this.loadJSON(STORAGE_KEYS.BOOKMARKS, ['story-ai-antitrust']),
      pollResponses: this.loadJSON(STORAGE_KEYS.POLLS, {}),
      account: this.loadJSON(STORAGE_KEYS.ACCOUNT, null), // { email, name, plan } | null
      edition: this.loadJSON(STORAGE_KEYS.EDITION, { code: 'us', label: 'United States', flag: '🇺🇸' }),
      newsletters: this.loadJSON(STORAGE_KEYS.NEWSLETTERS, {}), // newsletterId -> email
      followedTopics: this.loadJSON(STORAGE_KEYS.FOLLOWED_TOPICS, []),
      localCity: localStorage.getItem(STORAGE_KEYS.LOCAL_CITY) || ''
    };
  }

  loadJSON(key, fallback) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch {
      return fallback;
    }
  }

  saveJSON(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  }

  getState() {
    return { ...this.state };
  }

  setState(updates) {
    this.state = { ...this.state, ...updates };

    if ('theme' in updates) {
      localStorage.setItem(STORAGE_KEYS.THEME, this.state.theme);
      document.documentElement.setAttribute('data-theme', this.state.theme);
    }
    if ('dietHistory' in updates) {
      this.saveJSON(STORAGE_KEYS.DIET_HISTORY, this.state.dietHistory);
    }
    if ('bookmarks' in updates) {
      this.saveJSON(STORAGE_KEYS.BOOKMARKS, this.state.bookmarks);
    }
    if ('pollResponses' in updates) {
      this.saveJSON(STORAGE_KEYS.POLLS, this.state.pollResponses);
    }
    if ('account' in updates) {
      this.saveJSON(STORAGE_KEYS.ACCOUNT, this.state.account);
    }
    if ('edition' in updates) {
      this.saveJSON(STORAGE_KEYS.EDITION, this.state.edition);
    }
    if ('newsletters' in updates) {
      this.saveJSON(STORAGE_KEYS.NEWSLETTERS, this.state.newsletters);
    }
    if ('followedTopics' in updates) {
      this.saveJSON(STORAGE_KEYS.FOLLOWED_TOPICS, this.state.followedTopics);
    }
    if ('localCity' in updates) {
      try {
        localStorage.setItem(STORAGE_KEYS.LOCAL_CITY, this.state.localCity);
      } catch (e) {
        console.warn('Failed to save local city:', e);
      }
    }

    this.notify();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  // Action Helpers
  setTheme(theme) {
    this.setState({ theme });
  }

  setView(activeView) {
    this.setState({ activeView, selectedStoryId: null });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  setCategory(activeCategory) {
    this.setState({ activeCategory });
  }

  setBlindspotFilter(blindspotFilter) {
    this.setState({ blindspotFilter });
  }

  setSearch(searchQuery) {
    this.setState({ searchQuery });
  }

  openStoryModal(storyId, storyBiasDistribution) {
    this.recordReadStory(storyId, storyBiasDistribution);
    this.setState({ selectedStoryId: storyId });
  }

  closeStoryModal() {
    this.setState({ selectedStoryId: null });
  }

  setGlobalPerspective(perspective) {
    let spectrum = 50;
    if (perspective === 'left') spectrum = 15;
    if (perspective === 'center') spectrum = 50;
    if (perspective === 'right') spectrum = 85;
    this.setState({ globalPerspective: perspective, spectrumValue: spectrum });
  }

  setSpectrumValue(val) {
    let perspective = 'balanced';
    if (val <= 33) perspective = 'left';
    else if (val >= 67) perspective = 'right';
    else perspective = 'center';
    this.setState({ spectrumValue: val, globalPerspective: perspective });
  }

  setStoryPerspective(storyId, perspective) {
    const storyPerspectives = { ...this.state.storyPerspectives, [storyId]: perspective };
    this.setState({ storyPerspectives });
  }

  getStoryPerspective(storyId) {
    return this.state.storyPerspectives[storyId] || this.state.globalPerspective;
  }

  toggleBookmark(storyId) {
    const isBookmarked = this.state.bookmarks.includes(storyId);
    const bookmarks = isBookmarked
      ? this.state.bookmarks.filter(id => id !== storyId)
      : [...this.state.bookmarks, storyId];
    this.setState({ bookmarks });
  }

  recordReadStory(storyId, biasDistribution) {
    // Record in user diet
    const dominantBias = biasDistribution.left > biasDistribution.right
      ? (biasDistribution.left > biasDistribution.center ? 'Left' : 'Center')
      : (biasDistribution.right > biasDistribution.center ? 'Right' : 'Center');

    const dietHistory = [
      { storyId, bias: dominantBias, leftPct: biasDistribution.left, centerPct: biasDistribution.center, rightPct: biasDistribution.right, timestamp: Date.now() },
      ...this.state.dietHistory.filter(item => item.storyId !== storyId)
    ].slice(0, 100); // keep last 100
    this.setState({ dietHistory });
  }

  recordPollVote(storyId, answer) {
    const pollResponses = { ...this.state.pollResponses, [storyId]: answer };
    this.setState({ pollResponses });
  }

  clearPollVote(storyId) {
    const pollResponses = { ...this.state.pollResponses };
    delete pollResponses[storyId];
    this.setState({ pollResponses });
  }

  // ── Account, edition, follows, newsletters, local news ─────────────────────
  setAccount(account) {
    this.setState({ account });
  }

  signOut() {
    this.setState({ account: null });
  }

  setSubscriptionPlan(plan) {
    if (!this.state.account) return;
    this.setState({ account: { ...this.state.account, plan } });
  }

  setEdition(edition) {
    this.setState({ edition });
  }

  isFollowingTopic(topic) {
    return this.state.followedTopics.includes(topic);
  }

  toggleFollowTopic(topic) {
    const isFollowing = this.state.followedTopics.includes(topic);
    const followedTopics = isFollowing
      ? this.state.followedTopics.filter(t => t !== topic)
      : [...this.state.followedTopics, topic];
    this.setState({ followedTopics });
    return !isFollowing;
  }

  isSubscribed(newsletterId) {
    return Boolean(this.state.newsletters[newsletterId]);
  }

  subscribeNewsletter(newsletterId, email) {
    this.setState({ newsletters: { ...this.state.newsletters, [newsletterId]: email } });
  }

  unsubscribeNewsletter(newsletterId) {
    const newsletters = { ...this.state.newsletters };
    delete newsletters[newsletterId];
    this.setState({ newsletters });
  }

  setLocalCity(city) {
    this.setState({ localCity: city });
  }

  clearLocalCity() {
    this.setState({ localCity: '' });
  }

  resetDiet() {
    this.setState({ dietHistory: [] });
  }

  calculateDietStats() {
    const history = this.state.dietHistory;
    if (!history.length) {
      return { total: 0, left: 33, center: 34, right: 33, alert: null };
    }

    let leftSum = 0;
    let centerSum = 0;
    let rightSum = 0;

    for (const item of history) {
      leftSum += item.leftPct || (item.bias === 'Left' ? 70 : 15);
      centerSum += item.centerPct || (item.bias === 'Center' ? 70 : 15);
      rightSum += item.rightPct || (item.bias === 'Right' ? 70 : 15);
    }

    const totalWeight = leftSum + centerSum + rightSum;
    const leftPct = Math.round((leftSum / totalWeight) * 100);
    const centerPct = Math.round((centerSum / totalWeight) * 100);
    const rightPct = 100 - leftPct - centerPct;

    let alert = null;
    if (leftPct >= 55) {
      alert = {
        type: 'left-heavy',
        title: 'Left-Leaning News Diet Detected',
        message: 'Over 55% of your reading material leans Left. You may have a blindspot for stories covered exclusively by Right-leaning outlets.',
        actionView: 'blindspots',
        actionFilter: 'left-blindspots',
        actionLabel: 'Explore Left Blindspots'
      };
    } else if (rightPct >= 55) {
      alert = {
        type: 'right-heavy',
        title: 'Right-Leaning News Diet Detected',
        message: 'Over 55% of your reading material leans Right. You may have a blindspot for stories covered exclusively by Left-leaning outlets.',
        actionView: 'blindspots',
        actionFilter: 'right-blindspots',
        actionLabel: 'Explore Right Blindspots'
      };
    } else {
      alert = {
        type: 'balanced',
        title: 'Well-Balanced News Diet',
        message: 'Your reading history shows balanced exposure across Left, Center, and Right coverage. Great job staying out of echo chambers!'
      };
    }

    return {
      total: history.length,
      left: leftPct,
      center: centerPct,
      right: rightPct,
      alert
    };
  }
}

export const store = new StateManager();
