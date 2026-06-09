import 'dotenv/config';
import { campaignRepo } from '../repositories/campaignRepo';
import { analyzeCampaign } from '../services/groqService';

async function main() {
  console.log('Testing campaign analysis endpoint...');
  const campaigns = await campaignRepo.findAll();
  if (campaigns.length === 0) {
    console.error('No campaigns found in database');
    return;
  }
  
  const campaign = campaigns[0];
  console.log('Selected Campaign ID:', campaign.id);
  console.log('Selected Campaign Name:', campaign.name);
  
  const stats = await campaignRepo.findStats(campaign.id);
  console.log('Stats:', stats);
  
  if (!stats) {
    console.error('No stats found for campaign');
    return;
  }
  
  try {
    console.log('Calling analyzeCampaign with Groq...');
    const result = await analyzeCampaign(
      stats,
      campaign.segment_name ?? 'Unknown Segment',
      campaign.channel
    );
    console.log('Analysis result successful!');
    console.log('Snippet:', result.slice(0, 150));
  } catch (err: any) {
    console.error('--- GROQ ANALYSIS ERROR ---');
    console.error(err);
  }
}

main().catch(console.error);
