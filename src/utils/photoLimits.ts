export const getPhotoLimit = (tier: string | undefined): number => {
  switch (tier) {
    case 'free':
      return 5;
    case 'basic':
      return 50;
    case 'standard':
      return 100;
    case 'premium':
      return Infinity;
    default:
      return 5; // default to free tier limit
  }
};
