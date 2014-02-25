# Hotstuff

This is an experiment **and** a work in progress. If you use this, it will
probably change out from under you.

## Synopsis

This is a simple utility to discover pages as they come up from many sources
(Reddit, Twitter, etc). Right now I have only written a Reddit source. Each
page is mapped and assigned to buckets, so you can see where things came from
and partition content accordingly.

After discovery, the pages and knowledge gets stored in Mongo.

The final step is to present summary digests and fresh content in an easy to
consume, categorized fashion.

## Fetching

Hotstuff will fetch the content and store it in Mongo. This is to make further
analyzing a little easier, and so that we don't have to keep hitting remote
sites.

## Analyzers

Analyzers is where the real interesting stuff comes into the mix.

Take the content, run it through a series of analysis and categorize it.

# Running this thing

## Configuration

Configuration is done in `config/default.yml`. Setup the sources and analyzer configuration there.

After that, each script handles one part of the job.

  node discover # Find new links
  node fetch    # Fetch the content from each link and set meta-data
  node analyze  # Run all the configured analyzers, updating the records

Now, at this point you just have fully analyzed documents stored in MongoDB.
It's up to you to get something out of them! (I'm working on this part now)
