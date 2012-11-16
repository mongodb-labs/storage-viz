Storage-viz, visualize Mongo's storage and indexes
==================================================

© 2012 10gen, the MongoDB Company

Authors: Andrea Lattuada

**The commands used by this tool are currently EXPERIMENTAL and UNSUPPORTED.**

Storage-viz is a suite of web-based visualizers that leverage new database commands:
they make it easier to understand and analyze MongoDB storage and btree layout.

OVERVIEW
--------

The `storageDetails` command will aggregate statistics related to the
storage layout (when invoked with `analyze: "diskStorage"`) or the percentage
of pages currently in RAM (when invoked with `analyze: "pagesInRAM"`) for the
specified collection, extent or part of extent.

The `indexStats` command provides detailed and aggregate information and
statistics for the underlying btree of a particular index.
Stats are aggregated for the entire tree, per-depth and, if requested through
the `expandNodes` option, per-subtree.

Both commands take a global READ_LOCK and will page in all the extents or btree
buckets encountered: this will have adverse effects on server performance.
The commands should never be run on a primary and will cause a secondary to
fall behind on replication. `diskStorage` when run with
`analyze: "pagesInRAM"` is the exception as it typically returns rapidly and
may only page in extent headers.

USAGE
-----

To use the commands and visualizers you need a recent MongoDB Nightly build.

You can download a MongoDB Nightly binary from http://www.mongodb.org/downloads
(Nightly builds are generated from the unstable branch and should not be
used in production).

You can enable the experimental commands with

        --enableExperimentalStorageDetailsCmd
or

        --enableExperimentalIndexStatsCmd

**NOTE: running mongod with these options is unsafe and not advisable for
production servers.**

If you'd like to run the commands directly within the shell, helpers are
available.

Json output:

    db.collection.diskStorageStats({...})
    db.collection.pagesInRAM({...})
    db.collection.indexStats({index: "index name", ...})

Their counterparts providing human-readable output follow.

    db.collection.getDiskStorageStats({...})
    db.collection.getPagesInRAM({...})
    db.collection.getIndexStats({...})

VISUALIZERS
-----------

To use the visualizers the server needs to be started with the `--rest --jsonp` command
line flags.

**NOTE: running mongod with these options is unsafe and not advisable for
production servers.**
**`--rest` will allow everyone on the same network as the server to query or
modify data. Please refer to http://en.wikipedia.org/wiki/JSONP#Security_concerns
for security concerns related to `--jsonp`.**

The *visualizers* provide a nicer graphical representation but are very early stage
and have only been tested in Chrome.
The source code for them is available in this repository.

http://10gen-labs.github.com/storage-viz/diskStorage.html displays storage layout
and usage.

http://10gen-labs.github.com/storage-viz/indexStats.html shows statistics related
to the indexing btrees.

http://10gen-labs.github.com/storage-viz/pagesInRAM.html reports which parts of a
collection is currently in ram.

ADDITIONAL
----------

If you'd like to report a bug or request a new feature,
please file an issue on our github repository
(you must be logged into github to do this):

https://github.com/10gen-labs/storage-viz/issues/new
